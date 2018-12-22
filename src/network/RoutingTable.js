
class Bucket {

    constructor(nodesPerBucket) {
        this.nodes = [];
    }

}

class RoutingTable {

    constructor(rootNode, numBuckets = 256, nodesPerBucket = 20) {

        this.rootNode = rootNode;
        this.numBuckets = numBuckets;
        this.nodesPerBucket = nodesPerBucket;
        this.buckets = [];
        this.nodeIds = new Set();
    }

    addCandidate(node) {

        if (this.nodeIds.has(node.id)) {
            return false;
        }

        this.nodeIds.add(node.id);
    }

    getNode(nodeId) {

    }
}

module.exports = RoutingTable;