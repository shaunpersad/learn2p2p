const DHT = require('../../DHT');
const RPC = require('./components/RPC');
const Node = require('./components/Node');

class KademliaDHT extends DHT {

    static get constants() {

        const alpha = 5;
        const keySpace = 256;
        const k = 20;

        return {
            concurrency: alpha,
            numBuckets: keySpace,
            nodesPerBucket: k
        }
    }

    constructor(publicKey, privateKey, dhtStorage) {

        super();

        const rootNode = Node.createRootNode(publicKey, privateKey);
        this.rpc = new RPC(rootNode, dhtStorage, this.constructor.constants);
    }

    bootstrap({ port, address }, { port: peerPort, address: peerAddress }) {

        this.rpc.start(port, address).then(() => {

            if (peerAddress && peerPort) {

                const peerNode = new Node(peerAddress, peerPort);

                return this.rpc.issuePingRequest(peerNode)
                    .then(() => this.findClosestNodes())
                    .then(() => this.refreshBuckets())
                    .catch(console.log);
            }
        });
    }

    save(key, value) {

        return this.findClosestNodes(key, 'node').then(nodes => {

            const result = { success: 0, fail: 0 };
            const { WILL_NOT_STORE } = this.rpc.dhtStorage.constructor;

            return Promise.all(nodes.map(node => {

                return this.rpc.issueStoreRequest(node, key, value)
                    .catch(err => {

                        this.rpc.routingTable.removeNode(node.id);
                        return { content: WILL_NOT_STORE };
                    })
                    .then(({ content: status }) => {

                        status === this.rpc.dhtStorage.constructor.WILL_NOT_STORE ? result.fail++ : result.success++;
                    });

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

    findClosestNodes(subjectId = this.rpc.rootNode.id, subjectIdKind = 'node', nodeIdsGottenResponsesFor = []) {

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
}

module.exports = KademliaDHT;