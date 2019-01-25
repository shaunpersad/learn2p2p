const Value = require('../../components/kv-store/components/Value');
const ValueNotFoundError = require('../../components/errors/ValueNotFoundError');
const RPC = require('./components/RPC');
const Node = require('./components/Node');
const DHT = require('../../DHT');

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

    constructor(kvStore, publicKey, privateKey, dhtPort = null) {

        super(kvStore);

        const rootNode = Node.createRootNode(publicKey, privateKey);
        this.rpc = new RPC(rootNode, kvStore, this.constructor.constants, dhtPort);
    }

    bootstrap({ address, port } = {}) {

        return this.rpc.start()
            .then(() => {

                if (address && port) {

                    const bootstrapNode = new Node(null, address, port);

                    console.log('--- bootstrapping ---');

                    return this.rpc.issuePingRequest(bootstrapNode)
                        .then(() => console.log('--- finding closest nodes ---') || this.findClosestNodes())
                        .then(() => console.log('--- refreshing buckets ---') || this.refreshBuckets())
                        .then(() => console.log('--- num nodes:', this.rpc.routingTable.length, '---'))
                        .then(() => console.log('--- setting up timers ---') || this.setupTimers())
                        .then(() => console.log('--- bootstrapping complete ---'))
                        .catch(console.log);
                }
            })
            .then(() => this);
    }

    /**
     *
     * @param {string} key
     * @returns {Promise<{fail: number, success: number}>}
     */
    upload(key) {

        return Promise.all([
            this.kvStore.getValue(key),
            this.findClosestNodes(key, 'node')

        ]).then(([ value, nodes ]) => {

            console.log('value', value);

            const result = { success: 0, fail: 0 };

            return Promise.all(nodes.map(node => {

                return this.rpc.issueStoreRequest(node, key, value)
                    .catch(err => {

                        console.log('error', err);
                        this.rpc.routingTable.removeNode(node.id);
                        return { content: false };
                    })
                    .then(({ content: stored }) => {

                        console.log({ stored });
                        stored ? result.success++ : result.fail++;
                    });

            })).then(() => result);
        });
    }

    /**
     *
     * @param {string} key
     * @returns {Promise<Value>}
     */
    download(key) {

        return this.findClosestNodes(key, 'key').then(({ value, nodesWithValues }) => {

            const getValue = () => {

                const node = nodesWithValues.pop();
                if (!node) {
                    throw new ValueNotFoundError('No suitable nodes found with this value.');
                }

                let p = Promise.resolve();
                switch (value.type) {
                    case Value.TYPE_PARTIAL:
                        p = this.rpc.issuePartialValueRequest(node, key, value.data);
                        break;
                    case Value.TYPE_RAW:
                        p = this.kvStore.saveRawValueData(key, value.data);
                        break;

                }

                return p.then(() => value).catch(err => getValue());
            };

            return getValue();
        });
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
            return subjectIdKind === 'node'
                ? Promise.resolve(closestNodes)
                : Promise.reject(new ValueNotFoundError());
        }

        let holePunchedNodes = null;
        let value = null;
        const nodesWithValues = [];

        return Promise.all(closestPendingNodes.slice(0, this.rpc.concurrency).map(node => {

            const request = subjectIdKind === 'node'
                ? this.rpc.issueFindNodeRequest(node, subjectId)
                : this.rpc.issueFindValueRequest(node, subjectId);

            return request
                .then(({ id: originalMessageId, nodeId, content: { type, payload } }) => {

                    nodeIdsGottenResponsesFor.push(nodeId);

                    switch (type) {
                        case 'nodes':
                            holePunchedNodes = payload;
                            holePunchedNodes.forEach(node => {

                                if (node.id !== this.rpc.rootNode.id) {
                                    newNodesToPing[node.id] = { node, originalMessageId };
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

                        const { node, originalMessageId } = newNodesToPing[nodeId];
                        const messageId = `${nodeId}_${originalMessageId}`;

                        return this.rpc.issuePingRequest(node, messageId).catch(err => {});
                    }
                }));
            })
            .then(() => {

                if (value && subjectIdKind === 'key') {

                    return { value: new Value(value.type, value.data), nodesWithValues };

                    // const nodeToCache = closestPendingNodes.find(node => !nodesWithValues.includes(node.id));
                    //
                    // const p = nodeToCache
                    //     ? this.rpc.issueStoreRequest(nodeToCache, subjectId, value).catch(console.log)
                    //     : Promise.resolve();
                }

                return this.findClosestNodes(subjectId, subjectIdKind, nodeIdsGottenResponsesFor);
            });
    }

    setupTimers() {

        this.holePunchKeepAliveTimer();
        this.republishKeysTimer();
        this.refreshBucketsTimer();
    }

    holePunchKeepAliveTimer() {

        setTimeout(() => {

            this.rpc.routingTable.buckets.forEach(bucket => {

                bucket.nodes.forEach(node => {

                    this.rpc.issueHolePunchKeepAlive(node);
                });
            });

            this.holePunchKeepAliveTimer();

        }, 30 * 1000);
    }

    republishKeysTimer() {

        setTimeout(() => {

            // todo

        }, 60 * 60 * 1000);
    }

    refreshBucketsTimer() {

        setTimeout(() => {

            this.refreshBuckets();

        }, 60 * 60 * 1000);
    }
}

module.exports = KademliaDHT;