const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const util = require('util');
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

const RPC = require('./RPC');
const Node = require('./Node');

class Kademlia {

    constructor() {
        this.keysDirectory = '';
        this.rootNode = null;
        this.rpc = null;
    }

    bootstrap({ port, address }, { port: peerPort, address: peerAddress }, keysDirectory = path.resolve(__dirname, '../../data/keys')) {

        this.keysDirectory = keysDirectory;

        this.init()
            .then(() => {

                this.rpc = new RPC(this.rootNode, port, address);

                if (peerAddress && peerPort) {

                    return this.rpc.ping(new Node(peerAddress, peerPort));
                }
            })
            .then(() => {

            });
    }

    init() {

        return Promise.all([
            readFile(path.join(this.keysDirectory, 'private.pem')),
            readFile(path.join(this.keysDirectory, 'public.pem'))
        ])
            .catch(err => {

                if (err.code !== 'ENOENT') {
                    throw err;
                }

                return this.generateKeys();
            })
            .then(([ privateKey, publicKey ]) => {

                this.node = Node.fromPublicKey(publicKey);
                this.node.privateKey = privateKey;
            });
    }

    generateKeys() {

        return new Promise((resolve, reject) => {

            if (!crypto.generateKeyPair) {
                return reject(new Error('Generating key pairs automatically is only available in Node >= v10.12. Please generate them youself in /data/keys as public.pem and private.pem.'));
            }

            crypto.generateKeyPair('rsa', {
                modulusLength: 4096,
                publicKeyEncoding: { type: 'spki', format: 'pem' },
                privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
            }, (err, publicKey, privateKey) => {

                if (err) {
                    return reject(err);
                }

                Promise.all([
                    writeFile(path.join(this.keysDirectory, 'private.pem'), privateKey),
                    writeFile(path.join(this.keysDirectory, 'public.pem'), publicKey)
                ]).then(() => ([ publicKey, privateKey ]));
            });
        });
    }
}

module.exports = Kademlia;