const crypto = require('crypto');

class Node {

    constructor(nodeId, publicKey, address, port) {
        this.address = address;
        this.port = port;
        this.id = nodeId;
        this.publicKey = publicKey;
        this.privateKey = '';
    }

    toJSON() {
        return {
            publicKey: this.publicKey,
            nodeId: this.id
        }
    }

    static fromPublicKey(publicKey, address, port, nodeId) {

        const id = crypto.createHash('sha256').update(publicKey).digest('hex');

        if (nodeId && (id !== nodeId)) {
            throw new Error('Node ID did not originate from this public key.');
        }

        return new this(nodeId, publicKey, address, port);
    }
}

module.exports = Node;
