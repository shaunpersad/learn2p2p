const { URL } = require('url');
const http = require('http');
const https = require('https');
const DHTStorage = require('./DHTStorage');

class DHTStorageForHTTPBlocks extends DHTStorage {

    constructor(maxDataLength, blockStorage, httpAddress) {
        super(maxDataLength);
        this.blockStorage = blockStorage;
        this.httpAddress = httpAddress;
    }

    save(key, value) {

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
                        .on('end', () => resolve());

                }).on('error', reject);

            } catch (err) {
                reject(err);
            }
        });
    }

    fetch(key) {

        return this.blockStorage.exists()
            .then(exists => {

                if (!exists) {
                    return null;
                }

                const url = new URL(`${key}.json`, this.httpAddress);
                return url.href;
            });
    }
}

module.exports = DHTStorageForHTTPBlocks;
