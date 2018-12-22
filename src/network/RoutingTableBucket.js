const RoutingTableBucketCache = require('./RoutingTableBucketCache');

class RoutingTableBucket {

    constructor(nodesPerBucket = 20) {
        this.nodes = [];
        this.nodesPerBucket = nodesPerBucket;
        this.cache = new RoutingTableBucketCache(nodesPerBucket);
    }

    save(node) {

        for (let x = 0; x < this.nodes.length; x++) {

            if (this.nodes[x].id === node.id) {

                this.nodes.splice(x, 1);
                break;
            }
        }

        if (this.nodes.length < this.nodesPerBucket) {
            this.nodes.unshift(node);
            return true;
        }
        this.cache.push(node);
        return false;
    }

    fetch(nodeId) {

        for (let x = 0; x < this.nodes.length; x++) {

            if (this.nodes[x].id === nodeId) {

                return this.nodes[x];
            }
        }

        return this.cache.fetch(nodeId);
    }

    removeNode(nodeId) {

        for (let x = 0; x < this.nodes.length; x++) {

            if (this.nodes[x].id === nodeId) {

                this.nodes.splice(x, 1);
                break;
            }
        }

        this.fillFromCache();
    }

    fillFromCache() {

        while (this.nodes.length < this.nodesPerBucket) {
            const node = this.cache.pull();
            if (!node) {
                return;
            }
            this.save(node);
        }
    }

    getLeastRecentNodes(amount = 1) {

        const nodes = [];
        for (let x = this.nodes.length - 1; x >= 0; x--) {
            nodes.push(this.nodes[x]);
            if (!--amount) {
                break;
            }
        }
        return nodes;
    }
}

module.exports = RoutingTableBucket;
