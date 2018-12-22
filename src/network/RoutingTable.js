const RoutingTableBucket = require('./RoutingTableBucket');

class RoutingTable {

    constructor(rootNode, numBuckets = 256, nodesPerBucket = 20) {

        this.rootNode = rootNode;
        this.numBuckets = numBuckets;
        this.buckets = [];

        for (let x = 0; x < numBuckets; x++) {
            this.buckets[x] = new RoutingTableBucket(nodesPerBucket);
        }
    }

    addCandidate(node) {

        const distance = this.xor(node.id, this.rootNode.id);
        const bucketIndex = this.getBucketIndex(distance);
        const bucket = this.buckets[bucketIndex];

        if (bucket.save(node)) {
            return -1;
        }

        return bucketIndex;
    }

    getNode(nodeId) {

        const distance = this.xor(nodeId, this.rootNode.id);
        const bucketIndex = this.getBucketIndex(distance);
        const bucket = this.buckets[bucketIndex];

        return bucket.fetch(nodeId);
    }

    getBucket(bucketIndex) {
        return this.buckets[bucketIndex];
    }

    xor(nodeId1, nodeId2) {

        const buffer1 = Buffer.from(nodeId1);
        const buffer2 = Buffer.from(nodeId2);
        const result = [];

        for (let i = 0; i < buffer1; i++) {
            result.push(buffer1[i] ^ buffer2[i]);
        }

        return Buffer.from(result);
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

        return this.numBuckets - commonPrefixCount;
    }

    static getBit(number, bitPosition) {
        return (number & (1 << bitPosition)) === 0 ? 0 : 1;
    }
}

module.exports = RoutingTable;