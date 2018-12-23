const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const util = require('util');
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

const DHT = require('./_DHT');
const RPC = require('./RPC');
const Node = require('./Node');

class KademliaDHT extends DHT {

    constructor(dataDirectory = path.resolve(__dirname, '../../data')) {

        super();

        this.privateKeyPath =  path.join(dataDirectory, 'private', 'private-key.pem');
        this.publicKeyPath =  path.join(dataDirectory, 'public', 'public-key.pem');
        this.rpc = null;
    }

    bootstrap({ port, address }, { port: peerPort, address: peerAddress }) {

        return Promise.all([ readFile(this.privateKeyPath), readFile(this.publicKeyPath) ])
            .catch(err => {

                if (err.code !== 'ENOENT') {
                    throw err;
                }

                return this.constructor.generateKeys()
                    .then(({ publicKey, privateKey }) => {

                        return Promise.all([
                            writeFile(this.privateKeyPath, privateKey),
                            writeFile(this.publicKeyPath, publicKey)
                        ]).then(() => ([ publicKey, privateKey ]));
                    });
            })
            .then(([ privateKey, publicKey ]) => {

                const rootNode = Node.createRootNode(publicKey, privateKey);
                this.rpc = new RPC(rootNode, { port, address }, this.constructor.constants);

                if (peerAddress && peerPort) {

                    return this.rpc.issuePingRequest(new Node(peerAddress, peerPort))
                        .then(() => this.findClosestNodes(rootNode.id))
                        .then(() => this.refreshBuckets())
                        .catch(() => console.log('Bootstrapped node not answering.'));
                }
            });
    }

    save(key, value) {

        return this.findClosestNodes(key, 'node').then(nodes => {

            const result = { success: 0, fail: 0 };

            return Promise.all(nodes.map(node => {

                return this.rpc.issueStoreRequest(node, key, value)
                    .then(() => result.success++)
                    .catch(() => result.fail++);

            })).then(() => result);
        });
    }

    fetch(key) {

        return this.findClosestNodes(key, 'key');
    }

    refreshBuckets() {

        const nodesToLookup = this.rpc.routingTable.getOneNodePerBucket();
        return Promise.all(nodesToLookup.map(node => this.findClosestNodes(node.id, 'node')));
    }

    findClosestNodes(subjectId, subjectIdKind = 'node', nodeIdsGottenResponsesFor = []) {

        const closestNodes = this.rpc.routingTable.getClosestNodes(subjectId);
        const closestPendingNodes = closestNodes.filter(node => !nodeIdsGottenResponsesFor.includes(node.id));
        const newNodesToPing = {};

        if (!closestPendingNodes.length) {
            return subjectIdKind === 'node' ? closestPendingNodes : null;
        }

        let nodes = null;
        let value = null;
        const nodesWithValues = [];

        return Promise.all(closestPendingNodes.slice(this.rpc.concurrency).map(node => {

            const request = subjectIdKind === 'node' ? this.rpc.issueFindNodeRequest : this.rpc.issueFindValueRequest;

            return request(node, subjectId)
                .then(({ content: { payload, type } }) => {

                    nodeIdsGottenResponsesFor.push(node.id);

                    switch (type) {
                        case 'nodes':
                            nodes = payload;
                            nodes.forEach(node => {

                                if (node.id !== this.rpc.rootNode.id) {
                                    newNodesToPing[node.id] = node;
                                }
                            });
                            break;
                        case 'value':
                            value = payload;
                            nodesWithValues.push(node);
                            break;
                    }
                })
                .catch(err => this.rpc.routingTable.removeNode(node.id));

        }))
            .then(() => {

                return Promise.all(Object.keys(newNodesToPing).map(nodeId => {

                    if (!this.rpc.routingTable.getNode(nodeId)) {

                        const node = newNodesToPing[nodeId];

                        return this.rpc.issuePingRequest(node).catch(err => {});
                    }
                }));
            })
            .then(() => {

                if (value && subjectIdKind === 'key') {

                    const nodeToCache = closestPendingNodes.find(node => !nodesWithValues.includes(node.id));

                    const p = nodeToCache
                        ? this.rpc.issueStoreRequest(nodeToCache, subjectId, value).catch(console.log)
                        : Promise.resolve();

                    return p.then(() => value);
                }

                return this.findClosestNodes(subjectId, subjectIdKind, nodeIdsGottenResponsesFor);
            });
    }

    static generateKeys() {

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

                resolve({ publicKey, privateKey });
            });
        });
    }

    static get constants() {

        return {
            concurrency: 5,
            numBuckets: 256,
            nodesPerBucket: 20
        }
    }
}

module.exports = KademliaDHT;