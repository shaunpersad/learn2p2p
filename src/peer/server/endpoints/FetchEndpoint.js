const Endpoint = require('../Endpoint');
const BlockNotFoundError = require('../../../blocks/components/errors/BlockNotFoundError');

class FetchEndpoint extends Endpoint {

    downloadWithLinks(hash) {

        return this.codec.getBlockLinks(hash)
            .then(links => {

                if (!links.length) {
                    return hash;
                }

                return Promise.all(links.map(hash => this.downloadWithLinks(hash)));
            })
            .catch(err => {

                if (!(err instanceof BlockNotFoundError)) {
                    throw err;
                }

                return this.dht.download(hash).then(() => this.downloadWithLinks(hash));
            });
    }

    handler(req, res) {

        const [ hash ] = req.url.split('/').filter(piece => !!piece);
        if (!hash) {
            res.statusCode = 400;
            return res.end('No hash found in URL.');
        }

        this.downloadWithLinks(hash)
            .then(() => this.codec.decode(hash, res))
            .catch(err => res.statusCode = 500 && res.end(err.message));
    }
}

module.exports = FetchEndpoint;