const Block = require('../../../../blocks/Block');

class Node {

    constructor(nodeId, address, port, publicKey = null) {
        this.address = address;
        this.port = parseInt(port);
        this.id = nodeId;
        this.publicKey = publicKey ? publicKey.toString() : null;
        this.privateKey = '';
    }

    toJSON() {
        return {
            id: this.id,
            address: this.address,
            port: this.port
        };
    }

    toJSONWithPublicKey() {

        return Object.assign(this.toJSON(), { publicKey: this.publicKey });
    }

    static fromPublicKey(publicKey, address, port, nodeId) {

        const id = Block.createHash().update(publicKey).digest('hex');

        if (nodeId && (id !== nodeId)) {
            throw new Error('Node ID did not originate from this public key.');
        }

        return new this(id, address, port, publicKey);
    }

    static createRootNode(publicKey, privateKey) {

        const node = this.fromPublicKey(publicKey);
        node.privateKey = privateKey.toString();

        return node;
    }
}

module.exports = Node;
