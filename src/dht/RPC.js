const dgram = require('dgram');
const crypto = require('crypto');

const RoutingTable = require('./RoutingTable');
const Node = require('./Node');

class RPC {

    constructor(rootNode, { port, address }, { concurrency, numBuckets, nodesPerBucket }) {

        this.rootNode = rootNode;
        this.concurrency = concurrency;

        this.server = dgram.createSocket('udp4');
        this.server.on('error', this.onError.bind(this));
        this.server.on('message', this.receiveMessage.bind(this));
        this.server.on('listening', () => console.log('Listening on port', port));
        this.server.bind(port, address);

        this.routingTable = new RoutingTable(this.rootNode, numBuckets, nodesPerBucket);
        this.pendingRequests = {};
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
                bodyText = crypto.privateDecrypt(this.rootNode.privateKey, Buffer.from(bodyText, 'base64')).toString('utf8');
            }
            pieces = bodyText.split('\n');

            const signatureLength = parseInt(pieces.shift());
            const afterHeader = pieces.join('\n');
            const signature = afterHeader.substring(0, signatureLength);
            const bodyJSON = afterHeader.replace(signature, '');

            const body = JSON.parse(bodyJSON);
            const { id, nodeId, type, content } = body;

            if (!id || !nodeId || !type || !content) {
                return;
            }

            const node = type === ('PING' || 'PING_REPLY')
                ? Node.fromPublicKey(content, address, port, nodeId)
                : (this.routingTable.getNode(nodeId) || new Node(nodeId, address, port));

            const p = node.publicKey
                ? Promise.resolve(node.publicKey)
                : this.issuePingRequest(node).then(({ content }) => content);

            return p.then(publicKey => {

                node.publicKey = publicKey;

                if (!crypto.createVerify('SHA256').update(bodyJSON).verify(node.publicKey, signature)) {

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

                        if (this.pendingRequests[id] && type === `${this.pendingRequests[id].type}_REPLY`) {

                            const { resolve } = this.pendingRequests[id];
                            delete this.pendingRequests[id];

                            return resolve(body);

                        } else if (!type.endsWith('_REPLY')) {

                            return this.requestHandler(body);
                        }
                    })
                ]);
            });

        }).catch(console.log);

    }

    sendMessage(toNode, type, content, encrypted = true, messageId = null) {

        return new Promise((resolve, reject) => {

            const body = {
                id: messageId || Math.random(),
                nodeId: this.rootNode.id,
                type,
                content
            };

            const bodyJSON = JSON.stringify(body);
            const signature = crypto.createSign('SHA256').update(bodyJSON).sign(this.rootNode.privateKey, 'hex');
            let bodyText = `${signature.length}\n${signature}${bodyJSON}`;

            if (encrypted) {

                if (!toNode.publicKey) {
                    throw new Error('Cannot encrypt without a public key.');
                }

                bodyText = crypto.publicEncrypt(toNode.publicKey, Buffer.from(bodyText)).toString('base64');
            }

            const message = `${encrypted?'1':'0'}\n${bodyText}`;

            this.server.send(message, toNode.port, toNode.address, err => {

                err ? reject(err) : resolve(body.id);
            });
        });
    }

    sendMessageAndWait(timeToWait, toNode, type, content, encrypted = true, messageId = null) {

        return new Promise((resolve, reject) => {

            this.sendMessage(toNode, type, content, encrypted, messageId)
                .then(messageId => {

                    this.pendingRequests[messageId] = { type, resolve };

                    setTimeout(() => {

                        delete this.pendingRequests[messageId];

                        reject(new Error('Request timed out.'));

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

        return this.reply(fromNode, messageId, 'PING', this.rpc.rootNode.publicKey);
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

    }

    issueFindValueRequest(toNode, key) {

        return this.sendMessageAndWait(10000, toNode, 'FIND_VALUE', key);
    }

    handleFindValueRequest(fromNode, key, messageId) {

    }

    reply(toNode, messageId, type, content) {

        return this.sendMessage(toNode, `${type}_REPLY`, content, type !== 'PING', messageId);
    }
}

module.exports = RPC;
