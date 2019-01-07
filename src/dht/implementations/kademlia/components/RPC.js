const dgram = require('dgram');

const Value = require('../../../components/kv-store/components/Value');
const MessageProtocol = require('./MessageProtocol');
const RoutingTable = require('./RoutingTable');
const Node = require('./Node');
const closeServerOnExit = require('../../../../utils/closeServerOnExit');

class RPC {

    constructor(rootNode, kvStore, { concurrency, numBuckets, nodesPerBucket }, dhtPort = null) {

        this.rootNode = rootNode;
        this.kvStore = kvStore;
        this.concurrency = concurrency;
        this.dhtPort = dhtPort;

        this.messageProtocol = new MessageProtocol(this.rootNode.privateKey);
        this.routingTable = new RoutingTable(this.rootNode, numBuckets, nodesPerBucket);

        this.server = dgram.createSocket('udp4');

        this.pendingRequests = {};
        this.numRequests = 0;
    }

    start() {

        return new Promise((resolve, reject) => {

            this.server.on('message', this.receiveMessage.bind(this));
            this.server.once('error', reject);
            this.server.once('listening', () => {

                const { address, port } = this.server.address();
                console.log('Listening on', `${address}:${port}`);
                resolve();
            });
            this.server.bind(this.dhtPort);
            closeServerOnExit(this.server);
        });
    }

    receiveMessage(message, { address, port, size }) {

        if (!size) {
            return;
        }

        return this.messageProtocol.deserialize(message)
            .then(({ body, verifySignature }) => {

                const { id, nodeId, type, content } = body;

                if ([ id, nodeId, type, content ].includes(undefined)) {
                    throw new Error('Invalid message format.');
                }

                console.log('Receiving', type, 'from', nodeId, 'with id', id, 'and size', size);

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

        //console.log('Sending', type, 'to', toNode.id, 'with id', body.id);

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
                return this.handlePingRequest(fromNode, content, messageId);
            case 'FIND_NODE':
                return this.handleFindNodeRequest(fromNode, content, messageId);
            case 'STORE':
                return this.handleStoreRequest(fromNode, content, messageId);
            case 'FIND_VALUE':
                return this.handleFindValueRequest(fromNode, content, messageId);
            /**
             * Extensions
             */
            case 'PING_FORWARD':
                const { id, address, port, publicKey } = content;
                const forwardToNode = new Node(id, address, port, publicKey);
                return this.handlePingForwardRequest(fromNode, forwardToNode, messageId);

            default:
                return Promise.resolve();
        }
    }

    issuePingRequest(toNode, messageId = null) {

        return this.sendMessageAndWait(2000, toNode, 'PING', this.rootNode.publicKey, false, messageId);
    }

    handlePingRequest(fromNode, theirPublicKey, messageId) {

        return this.reply(fromNode, messageId, 'PING', this.rootNode.publicKey);
    }

    issueFindNodeRequest(toNode, nodeId) {

        return this.sendMessageAndWait(4000, toNode, 'FIND_NODE', nodeId);
    }

    handleFindNodeRequest(fromNode, nodeId, messageId) {

        return this.getFindResponseContent(fromNode, nodeId, messageId)
            .then(content => this.reply(fromNode, messageId, 'FIND_NODE', content));
    }

    issueStoreRequest(toNode, key, value) {

        return this.sendMessageAndWait(10000, toNode, 'STORE', { key, value });
    }

    handleStoreRequest(fromNode, { key, value: { type, data } }, messageId) {

        const p = type === Value.TYPE_RAW
            ? this.kvStore.saveRawValueData(key, data)
            : this.issuePartialValueRequest(fromNode, key, data);

        return p
            .then(() => true)
            .catch(err => false)
            .then(content => this.reply(fromNode, messageId, 'STORE', content));
    }

    issueFindValueRequest(toNode, key) {

        return this.sendMessageAndWait(10000, toNode, 'FIND_VALUE', key);
    }

    handleFindValueRequest(fromNode, key, messageId) {

        return this.kvStore.getValue(key)
            .catch(err => null)
            .then(value => this.getFindResponseContent(fromNode, key, messageId, value))
            .then(content => this.reply(fromNode, messageId, 'FIND_VALUE', content));
    }

    issuePingForwardRequest(toNode, forwardToNode, originalMessageId) {

        return this.sendMessage(toNode, 'PING_FORWARD', forwardToNode.toJSONWithPublicKey(), true, originalMessageId);
    }

    handlePingForwardRequest(fromNode, forwardToNode, originalMessageId) {

        const messageId = `${this.rootNode.id}_${originalMessageId}`;

        return this.handlePingRequest(forwardToNode, messageId);
    }

    issuePartialValueRequest(toNode, key, length, only = []) {

        const type = 'PARTIAL_VALUE';
        const content = { key, only };
        return this.kvStore.createPartialValue(key)
            .then(partialValue => partialValue.start())
            .then(partialValue => {

                return this.sendMessage(toNode, type, content)
                    .then(messageId => {

                        const chunks = new Set();
                        const requests = [];

                        return new Promise((resolve, reject) => {

                            let chunksCount = 0;
                            let t;
                            const makeTimeout = () => {
                                t = setTimeout(() => {

                                    if (!chunks.size) {
                                        return resolve();
                                    }

                                    if (chunksCount === chunks.size) {
                                        return reject(new Error('No progress made.'));
                                    }

                                    chunksCount = chunks.size;

                                    makeTimeout();

                                }, 5 * 1000);
                            };

                            for(let x = 0; x < length; x+= 1024) {

                                if (!only.length || only.includes(x)) {

                                    chunks.add(x);
                                    chunksCount++;

                                    const requestId = `${x}_${messageId}`;
                                    requests.push(requestId);
                                    this.pendingRequests[requestId] = {
                                        type,
                                        resolve: ({ id, content }) => {

                                            const x = parseInt(id.split('_')[0]);

                                            return partialValue.add(content, x)
                                                .then(() => chunks.delete(x))
                                                .catch(err => {

                                                    clearTimeout(t);
                                                    reject(err);
                                                });
                                        }
                                    };
                                }
                            }

                        }).catch(err => {

                            requests.forEach(requestId => {

                                if (this.pendingRequests[requestId]) {
                                    delete this.pendingRequests[requestId];
                                }
                            });

                            if (!only.length || chunks.size < only.length) {
                                return partialValue.pause()
                                    .then(() => this.issuePartialValueRequest(toNode, key, length, Array.from(chunks)));
                            }

                            throw err;
                        });
                    })
                    .then(() => partialValue.save())
                    .catch(err => {

                        return partialValue.destroy().then(() => {
                            throw err;
                        });
                    });
        });
    }

    handlePartialValueRequest(fromNode, key, only = [], originalMessageId) {

        return this.kvStore.forEachValueChunk(key, only, (chunk, index) => {

            const messageId = `${index}_${originalMessageId}`;

            return this.reply(fromNode, messageId, 'PARTIAL_VALUE', chunk);

        }).catch(err => {});
    }

    issueHolePunchKeepAlive(toNode) {

        this.server.send('', toNode.port, toNode.address);
    }

    getFindResponseContent(fromNode, subjectId, messageId, value = null) {

        if (value) {
            return Promise.resolve({ type: 'value', payload: value });
        }

        const nodes = this.routingTable.getClosestNodes(subjectId);
        const holePunchedNodes = [];

        return Promise.all(nodes.map(node => {

            if (node.id === fromNode.id) {
                return Promise.resolve();
            }

            return this.issuePingForwardRequest(node, fromNode, messageId)
                .then(() => holePunchedNodes.push(node))
                .catch(err => {});

        })).then(() => ({ type: 'nodes', payload: holePunchedNodes }));
    }

    reply(toNode, messageId, type, content) {

        return this.sendMessage(toNode, `${type}_REPLY`, content, type !== 'PING', messageId);
    }
}

module.exports = RPC;
