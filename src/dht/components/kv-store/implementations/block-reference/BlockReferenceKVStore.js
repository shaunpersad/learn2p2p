const { URL } = require('url');
const http = require('http');
const https = require('https');

const BlockNotFoundError = require('../../../../../blocks/components/errors/BlockNotFoundError');
const InvalidBlockError = require('../../../../../blocks/components/errors/InvalidBlockError');

const KVStore = require('../../KVStore');

class BlockReferenceKVStore extends KVStore {

    constructor(storage, httpAddress) {
        super();
        this.storage = storage;
        this.httpAddress = httpAddress;
        this.server = http.createServer();
        this.server.on('request', this.requestHandler.bind(this));
    }

    blockReference(key) {

        const url = new URL(`${key}.txt`, this.httpAddress);
        return url.href;
    }

    save(key, value) {

        return this.storage.blockExists(key)
            .then(exists => {

                if (exists) {
                    return false;
                }

                return this.storage.createNewBlock()
                    .then(block => {

                        const url = new URL(value);

                        return this.downloadFromUrlIntoBlock(url, block)
                            .then(() => block.save())
                            .then(hash => {

                                if (hash !== key) {
                                    return block.destroy().then(() => {
                                        throw new InvalidBlockError();
                                    });
                                }
                                return true;
                            });
                    });
            });
    }

    fetch(key) {

        return this.storage.blockExists(key)
            .then(exists => {

                if (!exists) {
                    return null;
                }

                return this.blockReference(key);
            });
    }

    host(port) {

        return new Promise(resolve => this.server.listen(port, () => resolve()));
    }

    downloadFromUrlIntoBlock(url, block) {

        return new Promise((resolve, reject) => {

            const protocol = url.protocol === 'https:' ? https : http;
            protocol.get(url, res => {

                const { statusCode } = res;

                if (statusCode !== 200) {
                    return reject(new Error('Request not successful.'));
                }

                res.pipe(block.createWriteStream())
                    .on('error', reject)
                    .on('end', () => resolve());

            }).on('error', reject);
        });
    }

    requestHandler(req, res) {

        if (req.method !== 'GET') {
            res.statusCode = 501;
            return res.end();
        }

        const [ hash ] = req.url.split('/').filter(piece => !!piece);

        if (!hash) {
            res.statusCode = 400;
            return res.end();
        }

        this.storage.createBlockReadStream(hash)
            .on('error', err => {

                if (!res.headersSent) {
                    res.statusCode = (err instanceof BlockNotFoundError) ? 404 : 500;
                }
                res.end();
            })
            .pipe(res);
    }
}

module.exports = BlockReferenceKVStore;
