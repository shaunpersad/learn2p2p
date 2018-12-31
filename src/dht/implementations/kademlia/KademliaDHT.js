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

    constructor(kvStore, publicKey, privateKey) {

        super(kvStore);

        const rootNode = Node.createRootNode(publicKey, privateKey);
        this.rpc = new RPC(rootNode, kvStore, this.constructor.constants);
    }

    init({ port, address }, { port: bootstrapPort, address: bootstrapAddress } = {}) {

        this.rpc.start(port, address).then(() => {

            if (bootstrapAddress && bootstrapPort) {

                const bootstrapNode = new Node(null, bootstrapAddress, bootstrapPort);

                return this.rpc.issuePingRequest(bootstrapNode)
                    .then(() => this.findClosestNodes())
                    .then(() => this.refreshBuckets())
                    .catch(console.log);
            }
        }).then(() => this);
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
            return subjectIdKind === 'node' ? closestNodes : null;
        }

        let nodes = null;
        let value = null;
        const nodesWithValues = [];

        return Promise.all(closestPendingNodes.slice(0, this.rpc.concurrency).map(node => {

            const request = subjectIdKind === 'node'
                ? this.rpc.issueFindNodeRequest(node, subjectId)
                : this.rpc.issueFindValueRequest(node, subjectId);

            return request.then(({ content: { payload, type } }) => {

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

                }).catch(err => this.rpc.routingTable.removeNode(node.id));

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