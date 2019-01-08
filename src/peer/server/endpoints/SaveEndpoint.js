const Endpoint = require('../Endpoint');

class SaveEndpoint extends Endpoint {

    uploadWithLinks(hash) {

        return this.dht.upload(hash) // save the block's location into the DHT
            .then(() => this.codec.getBlockLinks(hash))
            .then(links => {

                if (!links.length) {
                    return hash;
                }

                return Promise.all(links.map(hash => this.uploadWithLinks(hash)));
            });
    }

    handler(req, res) {

        this.codec.encode(req)
            .then(hash => this.uploadWithLinks(hash))
            .catch(err => err.message)
            .then(payload => res.end(payload));
    }
}

module.exports = SaveEndpoint;
