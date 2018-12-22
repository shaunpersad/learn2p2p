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
        this.rpc = null;
    }

    bootstrap({ port, address }, { port: peerPort, address: peerAddress }, dataDirectory = path.resolve(__dirname, '../../data')) {

        return Promise.all([
            readFile(this.constructor.privateKeyPath(dataDirectory)),
            readFile(this.constructor.publicKeyPath(dataDirectory))
        ])
            .catch(err => {

                if (err.code !== 'ENOENT') {
                    throw err;
                }

                return this.generateKeys(dataDirectory);
            })
            .then(([ privateKey, publicKey ]) => {

                const rootNode = Node.createRootNode(publicKey, privateKey);
                this.rpc = new RPC(rootNode, { port, address });

                this.rpc.on('message', this.onMessage.bind(this));

                if (peerAddress && peerPort) {

                    return this.rpc.ping(new Node(peerAddress, peerPort));
                }
            })
    }

    onMessage({ node, type, content, id }) {

        switch (type) {
            case 'PING':
                this.rpc.pingReply(node, id);
                break;
        }
    }

    generateKeys(dataDirectory = path.resolve(__dirname, '../../data')) {

        return new Promise((resolve, reject) => {

            if (!crypto.generateKeyPair) {
                return reject(new Error('Generating key pairs automatically is only available in Node >= v10.12. Please generate them youself in /data/keys as public.pem and private.pem.'));
            }

            crypto.generateKeyPair('rsa', {
                modulusLength: 2048,
                publicKeyEncoding: { type: 'spki', format: 'pem' },
                privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
            }, (err, publicKey, privateKey) => {

                if (err) {
                    return reject(err);
                }

                Promise.all([
                    writeFile(this.constructor.privateKeyPath(dataDirectory), privateKey),
                    writeFile(this.constructor.publicKeyPath(dataDirectory), publicKey)
                ]).then(() => ([ publicKey, privateKey ]));
            });
        });
    }

    static privateKeyPath(dataDirectory) {

        return path.join(dataDirectory, 'private', 'private-key.pem');
    }

    static publicKeyPath(dataDirectory) {

        return path.join(dataDirectory, 'public', 'public-key.pem');
    }
}

module.exports = Kademlia;