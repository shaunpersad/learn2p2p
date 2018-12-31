const dgram = require('dgram');

const MessageProtocol = require('./MessageProtocol');
const RoutingTable = require('./RoutingTable');
const Node = require('./Node');


class RPC {

    constructor(rootNode, kvStore, { concurrency, numBuckets, nodesPerBucket }) {

        this.rootNode = rootNode;
        this.kvStore = kvStore;
        this.concurrency = concurrency;
        this.messageProtocol = new MessageProtocol(this.rootNode.privateKey);

        this.server = dgram.createSocket('udp4');
        this.server.on('error', this.onError.bind(this));
        this.server.on('message', this.receiveMessage.bind(this));

        this.routingTable = new RoutingTable(this.rootNode, numBuckets, nodesPerBucket);
        this.pendingRequests = {};
        this.numRequests = 0;
    }

    start(port, address) {

        return new Promise(resolve => {

            this.server.on('listening', () => {

                const { address, port } = this.server.address();
                console.log('Listening on', `${address}:${port}`);
                resolve();
            });
            this.server.bind(port, address);
        });
    }

    onError(err) {

        this.server.close();

        throw err;
    }

    receiveMessage(message, { address, port }) {

        return this.messageProtocol.deserialize(message)
            .then(({ body, verifySignature }) => {

                const { id, nodeId, type, content } = body;

                if ([ id, nodeId, type, content ].includes(undefined)) {
                    throw new Error('Invalid message format.');
                }

                const node = (type === 'PING' || type === 'PING_REPLY')
                    ? Node.fromPublicKey(content, address, port, nodeId)
                    : (this.routingTable.getNode(nodeId) || new Node(nodeId, address, port));

                const p = node.publicKey
                    ? Promise.resolve()
                    : this.issuePingRequest(node).then(({ content }) => node.publicKey = content);

                return p.then(() => {

                    if (!verifySignature(node.publicKey)) {

                        return this.routingTable.removeNode(node.id);
                    }

                    return Promise.all([
                        Promise.resolve().then(() => {

                            const fullBucket = this.routingTable.addCandidate(node);

                            if (fullBucket) {

                                const nodes = fullBucket.getLeastRecentNodes(this.concurrency);

                                return Promise.all(nodes.map(node => {

                                    return this.issuePingRequest(node).catch(err => fullBucket.removeNode(node.id));
                                }));
                            }
                        }),
                        Promise.resolve().then(() => {

                            //console.log('handling message', id);
                            //console.log('handling received message of type', type);

                            if (this.pendingRequests[id] && type === `${this.pendingRequests[id].type}_REPLY`) {

                                //console.log('resolving');

                                const { resolve } = this.pendingRequests[id];
                                delete this.pendingRequests[id];

                                return resolve(body);

                            } else if (!type.endsWith('_REPLY')) {

                                //console.log('request handler');
                                return this.requestHandler(node, type, content, id);
                            } else {
                                //console.log('doing nothing');
                            }
                        })
                    ]);
                });

            }).catch(console.log);

    }

    sendMessage(toNode, type, content, encrypted = true, messageId = null) {

        const body = {
            id: messageId || `${++this.numRequests}_${Math.random()}`,
            nodeId: this.rootNode.id,
            type,
            content
        };

        const p = (encrypted && !toNode.publicKey)
            ? this.issuePingRequest(toNode).then(({ content }) => toNode.publicKey = content)
            : Promise.resolve();

        return p
            .then(() => this.messageProtocol.serialize(body, toNode.publicKey))
            .then(message => {

                return new Promise((resolve, reject) => {

                    this.server.send(message, toNode.port, toNode.address, err => {

                        err ? reject(err) : resolve(body.id);
                    });
                });
            });
    }

    sendMessageAndWait(timeToWait, toNode, type, content, encrypted = true, messageId = null) {

        return new Promise((resolve, reject) => {

            this.sendMessage(toNode, type, content, encrypted, messageId)
                .then(messageId => {

                    this.pendingRequests[messageId] = { type, resolve };

                    setTimeout(() => {

                        if (this.pendingRequests[messageId]) {

                            delete this.pendingRequests[messageId];
                            reject(new Error(`${type} request to ${toNode.id} timed out. Message ID: ${messageId}`));
                        }

                    }, timeToWait);
                })
                .catch(reject);
        });
    }

    requestHandler(fromNode, type, content, messageId) {

        switch (type) {
            case 'PING':
                return this.handlePingRequest(fromNode, messageId);
            case 'FIND_NODE':
                return this.handleFindNodeRequest(fromNode, content, messageId);
            case 'STORE':
                return this.handleStoreRequest(fromNode, content.key, content.value, messageId);
            case 'FIND_VALUE':
                return this.handleFindValueRequest(fromNode, content, messageId);
        }
    }

    issuePingRequest(toNode) {

        return this.sendMessageAndWait(2000, toNode, 'PING', this.rootNode.publicKey, false);
    }

    handlePingRequest(fromNode, messageId) {

        return this.reply(fromNode, messageId, 'PING', this.rootNode.publicKey);
    }

    issueFindNodeRequest(toNode, nodeId) {

        return this.sendMessageAndWait(4000, toNode, 'FIND_NODE', nodeId);
    }

    handleFindNodeRequest(fromNode, nodeId, messageId) {

        const nodes = this.routingTable.getClosestNodes(nodeId);
        return this.reply(fromNode, messageId, 'FIND_NODE', { type: 'nodes', payload: nodes });
    }

    issueStoreRequest(toNode, key, value) {

        return this.sendMessageAndWait(10000, toNode, 'STORE', { key, value });
    }

    handleStoreRequest(fromNode, key, value, messageId) {

        const { EXISTS, WILL_NOT_STORE, STORED } = this.kvStore.constructor;

        return this.kvStore.save(key, value)
            .then(stored => {

                const content = stored ? STORED : EXISTS;

                return this.reply(fromNode, messageId, 'STORE', content);
            })
            .catch(err => {

                return this.reply(fromNode, messageId, 'STORE', WILL_NOT_STORE);
            });
    }

    issueFindValueRequest(toNode, key) {

        return this.sendMessageAndWait(10000, toNode, 'FIND_VALUE', key);
    }

    handleFindValueRequest(fromNode, key, messageId) {

        return this.kvStore.fetch(key)
            .catch(err => null)
            .then(value => {

                if (!value) {
                    const nodes = this.routingTable.getClosestNodes(key);
                    return { type: 'nodes', payload: nodes };
                }

                return { type: 'value', payload: value };
            })
            .then(content => {

                return this.reply(fromNode, messageId, 'FIND_VALUE', content);
            });
    }

    reply(toNode, messageId, type, content) {

        return this.sendMessage(toNode, `${type}_REPLY`, content, type !== 'PING', messageId);
    }
}

module.exports = RPC;
