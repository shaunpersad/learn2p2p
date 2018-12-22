const dgram = require('dgram');
const crypto = require('crypto');
const EventEmitter = require('events');

const RoutingTable = require('./RoutingTable');
const Node = require('./Node');

class RPC extends EventEmitter {

    constructor(rootNode, { port, address }, concurrency = 3) {

        super();

        this.rootNode = rootNode;
        this.concurrency = concurrency;

        this.server = dgram.createSocket('udp4');
        this.server.on('error', this.onError.bind(this));
        this.server.on('message', this.receiveMessage.bind(this));
        this.server.on('listening', () => console.log('Listening on port', port));
        this.server.bind(port, address);

        this.routingTable = new RoutingTable(this.rootNode);
        this.pendingRequests = {};
    }

    onError(err) {

        this.server.close();
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

            const { id, nodeId, type, content } = JSON.parse(bodyJSON);

            const node = type === ('PING' || 'PING_REPLY')
                ? Node.fromPublicKey(content, address, port, nodeId)
                : (this.routingTable.getNode(nodeId) || new Node(nodeId, address, port));

            const p = node.publicKey ? Promise.resolve(node.publicKey) : this.ping(node);

            return p.then(publicKey => {

                node.publicKey = publicKey;

                if (!crypto.createVerify('SHA256').update(bodyJSON).verify(node.publicKey, signature)) {

                    return this.routingTable.removeNode(node.id);
                }

                if (type.endsWith('_REPLY') && this.pendingRequests[id]) {

                    this.pendingRequests[id](content);
                    delete this.pendingRequests[id];

                } else {
                    this.emit('message', { node, type, content, id });
                }

                const bucketIndex = this.routingTable.addCandidate(node);

                if (bucketIndex !== -1) {

                    const bucket = this.routingTable.getBucket(bucketIndex);
                    const nodes = bucket.getLeastRecentNodes(this.concurrency);

                    return Promise.all(nodes.map(node => this.ping(node).catch(err => bucket.removeNode(node.id))))
                }
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

    ping(toNode) {

        return new Promise((resolve, reject) => {

            this.sendMessage(toNode, 'PING', this.rootNode.publicKey, false)
                .then(messageId => {

                    this.pendingRequests[messageId] = resolve;

                    setTimeout(() => {

                        delete this.pendingRequests[messageId];

                        reject(new Error('No response.'));

                    }, 30000);
                })
                .catch(reject);
        });
    }

    pingReply(toNode, messageId) {

        return this.sendMessage(toNode, 'PING_REPLY', this.rootNode.publicKey, true, messageId);
    }

    store(toNode, key, value) {

        return this.sendMessage(toNode, 'STORE', { key, value });
    }

    reply(toNode, messageId, type, payload) {

        return this.sendMessage(toNode, `${type}_REPLY`, payload, type !== 'PING', messageId);
    }
}

module.exports = RPC;
