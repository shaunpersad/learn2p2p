
class RoutingTableBucketCache {

    constructor(maxNodesInCache = 100) {
        this.maxNodesInCache = maxNodesInCache;
        this.nodes = {};
        this.nodeIds = [];
    }

    push(node) {

        const index = this.nodeIds.indexOf(node.id);

        if (index !== -1) {

            this.nodeIds.splice(index, 1);

        } else if (this.nodeIds.length >= this.maxNodesInCache) {

            delete this.nodes[this.nodeIds.pop()];
        }

        this.nodeIds.unshift(node.id);
        this.nodes[node.id] = node;
    }

    pull() {

        if (!this.nodeIds.length) {
            return null;
        }

        const nodeId = this.nodeIds.shift();
        const node = this.nodes[nodeId];
        delete this.nodes[nodeId];

        return node;
    }

    fetch(nodeId) {
        return this.nodes[nodeId];
    }
}

module.exports = RoutingTableBucketCache;
