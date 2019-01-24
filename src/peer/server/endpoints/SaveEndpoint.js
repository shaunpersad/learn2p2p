const Endpoint = require('../Endpoint');

class SaveEndpoint extends Endpoint {

    uploadWithLinks(hash) {

        return this.dht.upload(hash) // save the block's location into the DHT
            .then(result => console.log(result) || this.codec.getBlockLinks(hash))
            .then(links => {

                if (links.length) {
                    return Promise.all(links.map(hash => this.uploadWithLinks(hash)));
                }
            })
            .then(() => hash);
    }

    handler(req, res) {

        console.log('encoding');
        this.codec.encode(req)
            .then(hash => console.log('uploading') || this.uploadWithLinks(hash))
            .catch(err => res.end(err.message))
            .then(payload => console.log('finished uploading') || res.end(payload));
    }
}

module.exports = SaveEndpoint;
