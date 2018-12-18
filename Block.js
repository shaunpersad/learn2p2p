/**
 * Blocks encapsulate a chunk of data (up to maxDataLength),
 * and any links needed to get to the rest of it beyond maxDataLength.
 * Links are simply hashes to other blocks.
 */
class Block {

    constructor(data = '', maxDataLength = 0) {
        this.data = data.substring(0, maxDataLength);
        this.links = [];
    }

    /**
     * Serializes the block in an unambiguous way.
     */
    toJSON() {
        return [ this.data ].concat(this.links);
    }

    toString() {
        return JSON.stringify(this);
    }
}

module.exports = Block;