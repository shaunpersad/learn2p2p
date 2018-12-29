const { URL } = require('url');
const http = require('http');
const https = require('https');

const BlockExistsError = require('../../../../../blocks/components/errors/BlockExistsError');
const BlockNotFoundError = require('../../../../../blocks/components/errors/BlockNotFoundError');
const InvalidBlockError = require('../../../../../blocks/components/errors/InvalidBlockError');

const Block = require('../../../../../blocks/Block');

const DHTKVStore = require('../../DHTKVStore');


class BlockReferenceDHTKVStore extends DHTKVStore {

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

        let url;

        try {
            url = new URL(value);
        } catch (err) {
            return Promise.reject(err);
        }

        return new Promise((resolve, reject) => {

            const protocol = url.protocol === 'https:' ? https : http;
            protocol.get(url, res => {

                const { statusCode } = res;

                if (statusCode !== 200) {
                    return reject(new Error('Request not successful.'));
                }

                const extractMetadata = Block.extractMetadata();

                res.pipe(extractMetadata)
                    .on('error', reject)
                    .pipe(this.storage.createWriteStreamAtHash(key))
                    .on('error', reject)
                    .on('end', () => {

                        if (extractMetadata[Block.HASH] !== key) {
                            reject(new InvalidBlockError());
                        }
                        resolve(true);
                    });

            }).on('error', reject);

        }).catch(err => {

            if (err instanceof BlockExistsError) {
                return false;
            }
            throw err;
        });

    }

    fetch(key) {

        return this.storage.exists(key)
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

        this.storage.createReadStreamAtHash(hash)
            .on('error', err => {

                if (!res.headersSent) {
                    res.statusCode = (err instanceof BlockNotFoundError) ? 404 : 500;
                }
                res.end();
            })
            .pipe(res);
    }
}

module.exports = BlockReferenceDHTKVStore;
