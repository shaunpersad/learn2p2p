
class RPCMessage {

    constructor(type, payload, nodeId, publicKey) {
        this.type = type;
        this.payload = payload;
        this.nodeId = nodeId;
        this.publicKey = publicKey;
    }

    toJSON() {
        return {
            type: this.type,
            payload: this.payload,
            from: {
                nodeId: this.nodeId,
                publicKey: this.publicKey
            }
        }
    }

}
