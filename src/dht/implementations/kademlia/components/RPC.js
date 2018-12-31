const dgram = require('dgram');
const crypto = require('crypto');
const util = require('util');
const randomBytes = util.promisify(crypto.randomBytes);

const RoutingTable = require('./RoutingTable');
const Node = require('./Node');


class RPC {

    constructor(rootNode, kvStore, { concurrency, numBuckets, nodesPerBucket }) {

        this.rootNode = rootNode;
        this.kvStore = kvStore;
        this.concurrency = concurrency;

        this.server = dgram.createSocket('udp4');
        this.server.on('error', this.onError.bind(this));
        this.server.on('message', this.receiveMessage.bind(this));

        this.routingTable = new RoutingTable(this.rootNode, numBuckets, nodesPerBucket);
        this.pendingRequests = {};
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

        message = message.toString();
        let pieces = message.split('\n');

        if (pieces.length < 2) {
            return;
        }

        Promise.resolve().then(() => {

            const encrypted = parseInt(pieces.shift());

            let bodyText = pieces.join('\n');
            if (encrypted) {
                const asymmetricSecret = pieces.shift();
                const asymmetricIv = pieces.shift();
                const symmetric = pieces.shift();
                if (!asymmetricSecret || !asymmetricIv || !symmetric) {
                    return;
                }

                const secret = crypto.privateDecrypt(this.rootNode.privateKey, Buffer.from(asymmetricSecret, 'base64'));
                const iv = crypto.privateDecrypt(this.rootNode.privateKey, Buffer.from(asymmetricIv, 'base64'));
                const decipher = crypto.createDecipheriv('aes-128-cbc', secret, iv);
                bodyText = decipher.update(symmetric, 'base64', 'utf8');
                bodyText+= decipher.final('utf8');
            }
            pieces = bodyText.split('\n');

            const signatureLength = parseInt(pieces.shift());
            const afterHeader = pieces.join('\n');
            const signature = afterHeader.substring(0, signatureLength);
            const bodyJSON = afterHeader.replace(signature, '');

            const body = JSON.parse(bodyJSON);
            const { id, nodeId, type, content } = body;

            console.log(type, 'message received, length', message.length);

            if (!id || !nodeId || !type || !content) {
                //console.log('short circuit 1');
                return;
            }

            const node = (type === 'PING' || type === 'PING_REPLY')
                ? Node.fromPublicKey(content, address, port, nodeId)
                : (this.routingTable.getNode(nodeId) || new Node(nodeId, address, port));

            const p = node.publicKey
                ? Promise.resolve(node.publicKey)
                : this.issuePingRequest(node).then(({ content }) => content);

            return p.then(publicKey => {

                node.publicKey = publicKey;

                if (!crypto.createVerify('SHA256').update(bodyJSON).verify(node.publicKey, signature, 'base64')) {

                    //console.log('short circuit 2');
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

                        // TODO: validation

                        //console.log('handling received message of type', type);

                        if (this.pendingRequests[id] && type === `${this.pendingRequests[id].type}_REPLY`) {

                            // console.log('resolving');

                            const { resolve } = this.pendingRequests[id];
                            delete this.pendingRequests[id];

                            return resolve(body);

                        } else if (!type.endsWith('_REPLY')) {

                            //console.log('handling', type, 'with request handler');
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

        //console.log('sending message of type', type);

        return new Promise((resolve, reject) => {

            const body = {
                id: messageId || Math.random(),
                nodeId: this.rootNode.id,
                type,
                content
            };

            const bodyJSON = JSON.stringify(body);
            const signature = crypto.createSign('SHA256').update(bodyJSON).sign(this.rootNode.privateKey, 'base64');
            let bodyText = `${signature.length}\n${signature}${bodyJSON}`;

            let p = Promise.resolve(bodyText);

            if (encrypted) {
                p = Promise.all([
                    randomBytes(16),
                    randomBytes(16)
                ]).then(([ secret, iv ]) => {

                    const asymmetricSecret = crypto.publicEncrypt(toNode.publicKey, secret).toString('base64');
                    const asymmetricIv = crypto.publicEncrypt(toNode.publicKey, iv).toString('base64');
                    const cipher = crypto.createCipheriv('aes-128-cbc', secret, iv);
                    let symmetric = cipher.update(bodyText, 'utf8', 'base64');
                    symmetric+= cipher.final('base64');

                    return `${asymmetricSecret}\n${asymmetricIv}\n${symmetric}`;
                });
            }

            p.then(bodyText => {

                const message = `${encrypted?'1':'0'}\n${bodyText}`;

                this.server.send(message, toNode.port, toNode.address, err => {

                    err ? reject(err) : resolve(body.id);
                });

            }).catch(reject);
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
                            reject(new Error(`${type} request timed out. Message ID: ${messageId}`));
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
