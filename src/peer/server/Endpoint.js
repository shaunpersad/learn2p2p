
class Endpoint {
    constructor(codec, dht) {
        this.codec = codec;
        this.dht = dht;
    }
    handler(req, res) {
        res.statusCode = 501;
        res.end('This operation is not supported.');
    }
}

module.exports = Endpoint;