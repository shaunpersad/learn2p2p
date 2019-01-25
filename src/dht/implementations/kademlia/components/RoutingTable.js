const RoutingTableBucket = require('./RoutingTableBucket');

class RoutingTable {

    constructor(rootNode, numBuckets = 256, nodesPerBucket = 20) {

        this.rootNode = rootNode;
        this.numBuckets = numBuckets;
        this.nodesPerBucket = nodesPerBucket;
        this.buckets = [];

        for (let x = 0; x < numBuckets; x++) {
            this.buckets[x] = new RoutingTableBucket(this.nodesPerBucket);
        }
    }

    get length() {

        return this.buckets.reduce((length, bucket) => {

            return length + bucket.nodes.length + bucket.cache.nodeIds.length;
        }, 0);
    }

    addCandidate(node) {

        if (node.id === this.rootNode.id) {
            return null;
        }
        console.log('added', node.id);

        const distance = this.constructor.xor(node.id, this.rootNode.id);
        const bucketIndex = this.getBucketIndex(distance);
        const bucket = this.buckets[bucketIndex];

        if (bucket.save(node)) {
            console.log('Num nodes:', )
            return null;
        }

        return bucket;
    }

    getNode(nodeId) {

        const distance = this.constructor.xor(nodeId, this.rootNode.id);
        const bucketIndex = this.getBucketIndex(distance);
        const bucket = this.buckets[bucketIndex];

        return bucket.fetch(nodeId);
    }

    getClosestNodes(subjectId, amount = this.nodesPerBucket) {

        const distance = this.constructor.xor(subjectId, this.rootNode.id);
        let bucketIndex = this.getBucketIndex(distance);

        const nodes = [];
        let iteration = 0;
        let bucketsVisited = 0;

        while (nodes.length < amount && bucketsVisited < this.numBuckets) {

            if (bucketIndex >= 0 && bucketIndex < this.numBuckets) {
                nodes.push(...this.buckets[bucketIndex].nodes);
                bucketsVisited++;
            }

            if (iteration++ % 2 === 0) {
                bucketIndex = bucketIndex - iteration;
            } else {
                bucketIndex = bucketIndex + iteration;
            }
        }

        return nodes;
    }

    getOneNodePerBucket() {

        return this.buckets
            .filter(bucket => bucket.nodes.length > 0)
            .map(bucket => bucket.nodes[Math.floor(Math.random() * bucket.nodes.length)]); // random node
    }

    removeNode(nodeId) {

        const distance = this.constructor.xor(nodeId, this.rootNode.id);
        const bucketIndex = this.getBucketIndex(distance);
        const bucket = this.buckets[bucketIndex];

        console.log('removing', nodeId);
        bucket.removeNode(nodeId);
    }

    getBucket(bucketIndex) {
        return this.buckets[bucketIndex];
    }
    
    getBucketIndex(distance) {

        let commonPrefixCount = 0;
        for (let byte = 0; byte < distance.length; byte++) {

            for (let bit = 0; bit < 8; bit++) {

                if ((distance[byte] & (0x80 >> bit)) === 0) {
                    commonPrefixCount++;
                }
            }
        }

        let index = this.numBuckets - commonPrefixCount - 1;
        if (index < 0) {
            index = 0;
        }

        return index;
    }

    static xor(nodeId1, nodeId2) {

        const buffer1 = Buffer.from(nodeId1, 'hex');
        const buffer2 = Buffer.from(nodeId2, 'hex');
        const result = [];

        for (let i = 0; i < buffer1.length; i++) {
            result.push(buffer1[i] ^ buffer2[i]);
        }

        return Buffer.from(result);
    }
}

module.exports = RoutingTable;