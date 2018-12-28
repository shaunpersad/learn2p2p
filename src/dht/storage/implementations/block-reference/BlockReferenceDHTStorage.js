const { URL } = require('url');
const http = require('http');
const https = require('https');
const DHTStorage = require('../../DHTStorage');
const DataValidator = require('../../../../blocks/codec/components/DataValidator');
const BlockNotFoundError = require('../../../../blocks/errors/BlockNotFoundError');

class BlockReferenceDHTStorage extends DHTStorage {

    constructor(maxDataLength, blockStorage, httpAddress) {
        super(maxDataLength);
        this.blockStorage = blockStorage;
        this.httpAddress = httpAddress;
        this.server = http.createServer();
        this.server.on('request', this.requestHandler.bind(this));
    }

    blockReference(key) {

        const url = new URL(`${key}.json`, this.httpAddress);
        return url.href;
    }

    save(key, value) {

        return this.blockStorage.exists(key)
            .then(exists => {

                if (exists) {
                    return false;
                }

                return new Promise((resolve, reject) => {

                    try {
                        const url = new URL(value);
                        const protocol = url.protocol === 'https:' ? https : http;
                        protocol.get(url, res => {

                            const { statusCode, headers } = res;

                            if (statusCode !== 200) {
                                return reject(new Error('Request not successful.'));
                            }
                            if (!/^application\/json/.test(headers['content-type'])) {
                                return reject(new Error('Block data must be JSON.'));
                            }

                            res.pipe(new DataValidator(key, this.maxDataLength))
                                .on('error', reject)
                                .pipe(this.blockStorage.saveStream())
                                .on('error', reject)
                                .on('end', () => resolve(true));

                        }).on('error', reject);

                    } catch (err) {
                        reject(err);
                    }
                });
            });
    }

    fetch(key) {

        return this.blockStorage.exists(key)
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

        res.setHeader('content-type', 'application/json');

        this.blockStorage.fetchStream()
            .on('error', err => {

                if (!res.headersSent) {
                    res.statusCode = (err instanceof BlockNotFoundError) ? 404 : 500;
                }
                res.end();
            })
            .pipe(res);

    }
}

module.exports = BlockReferenceDHTStorage;
