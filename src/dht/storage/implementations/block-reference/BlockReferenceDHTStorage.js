const { URL } = require('url');
const http = require('http');
const https = require('https');
const DHTStorage = require('../../DHTStorage');

class BlockReferenceDHTStorage extends DHTStorage {

    constructor(maxDataLength, blockStorage, httpAddress) {
        super(maxDataLength);
        this.blockStorage = blockStorage;
        this.httpAddress = httpAddress;
    }

    urlReference(key) {

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

                            res.pipe(this.blockStorage.saveStream(key, this.maxDataLength))
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

                return this.urlReference(key);
            });
    }

    host(port) {

    }
}

module.exports = BlockReferenceDHTStorage;
