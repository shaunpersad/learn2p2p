const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const util = require('util');
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

class KeyGenerator {

    constructor(dataDirectory = path.resolve(__dirname, '../../data')) {

        this.publicKeyPath =  path.join(dataDirectory, 'public', 'public-key.pem');
        this.privateKeyPath =  path.join(dataDirectory, 'private', 'private-key.pem');
    }

    getKeys() {

        return Promise.all([ readFile(this.publicKeyPath), readFile(this.privateKeyPath) ])
            .catch(err => {

                if (err.code !== 'ENOENT') {
                    throw err;
                }

                return this.generateKeys()
                    .then(({ publicKey, privateKey }) => {

                        return Promise.all([
                            writeFile(this.publicKeyPath, publicKey),
                            writeFile(this.privateKeyPath, privateKey)
                        ]).then(() => ([ publicKey, privateKey ]));

                    });
            })
            .then(([ publicKey, privateKey ]) => ({ publicKey, privateKey }));
    }

    generateKeys() {

        return new Promise((resolve, reject) => {

            if (!crypto.generateKeyPair) {
                return reject(new Error(`Generating key pairs automatically is only available in Node >= v10.12. Please generate them yourself in ${this.publicKeyPath} and ${this.privateKeyPath}.`));
            }

            crypto.generateKeyPair('rsa', {
                modulusLength: 4096,
                publicKeyEncoding: { type: 'spki', format: 'pem' },
                privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
            }, (err, publicKey, privateKey) => {

                if (err) {
                    return reject(err);
                }

                resolve({ publicKey, privateKey });
            });
        });
    }
}

module.exports = KeyGenerator;