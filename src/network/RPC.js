const dgram = require('dgram');
const crypto = require('crypto');

const RoutingTable = require('./RoutingTable');
const Node = require('./Node');

class RPC {

    constructor(rootNode, port, address) {

        this.rootNode = rootNode;

        this.server = dgram.createSocket('udp4');
        this.server.on('error', this.onError.bind(this));
        this.server.on('message', this.onMessage.bind(this));
        this.server.on('listening', this.onListening.bind(this));
        this.server.bind(port, address);

        this.routingTable = new RoutingTable(this.rootNode);

        this.pendingRequests = {};
    }

    onError(err) {

        this.server.close();
    }

    onMessage(message, { address, port }) {

        message = message.toString();
        const pieces = message.split('\n');

        if (pieces.length < 3) {
            return;
        }

        try {

            const encrypted = parseInt(pieces.shift());
            const signatureLength = parseInt(pieces.shift());
            const afterHeader = pieces.join('\n');
            const signature = afterHeader.substring(0, signatureLength);
            let bodyJSON = afterHeader.replace(signature, '');

            if (encrypted) {
                bodyJSON = crypto.privateDecrypt(this.rootNode.privateKey, Buffer.from(bodyJSON, 'base64')).toString('utf8');
            }

            const { from: { nodeId, publicKey }, messageId, type, content } = JSON.parse(bodyJSON);
            const node = Node.fromPublicKey(publicKey, address, port, nodeId);
            const verify = crypto.createVerify('SHA256');
            verify.update(bodyJSON);

            if (!verify.verify(publicKey, signature)) {
                return;
            }

            this.routingTable.addCandidate(node);

            if (type.endsWith('_REPLY') && this.pendingRequests[messageId]) {
                this.pendingRequests[messageId](content);
                delete this.pendingRequests[messageId];
            } else {
                this.handleIncomingMessage(node, type, content, messageId);
            }

        } catch (err) {

        }

    }

    sendMessage(toNode, type, content, encrypted = true, messageId) {

        return new Promise((resolve, reject) => {

            const body = {
                from: this.rootNode,
                messageId: messageId || Math.random(),
                type,
                content
            };

            let bodyJSON = JSON.stringify(body);

            const sign = crypto.createSign('SHA256');
            sign.update(bodyJSON);
            const signature = sign.sign(this.rootNode.privateKey, 'hex');

            if (encrypted) {

                if (!toNode.publicKey) {
                    throw new Error('Cannot encrypt without a public key.');
                }

                bodyJSON = crypto.publicEncrypt(toNode.publicKey, Buffer.from(bodyJSON)).toString('base64');
            }

            const message = `${encrypted? '1':'0'}\n${signature.length}\n${signature}${bodyJSON}`;

            this.server.send(message, toNode.port, toNode.address, err => {

                err ? reject(err) : resolve(body.messageId);
            });
        });
    }

    ping(toNode) {

        return new Promise((resolve, reject) => {

            this.sendMessage(toNode, 'PING', '', false)
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

    store(toNode, key, value) {

        return this.sendMessage(toNode, 'STORE', { key, value });
    }

    reply(toNode, messageId, type, payload) {

        return this.sendMessage(toNode, `${type}_REPLY`, payload, type !== 'PING', messageId);
    }

    handleIncomingMessage(node, type, content, messageId) {

    }

    onListening() {

    }
}

module.exports = RPC;
