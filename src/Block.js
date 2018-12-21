const crypto = require('crypto');

/**
 * Blocks encapsulate a chunk of data,
 * and any links needed to get to the rest of it beyond its maximum data length.
 * Links are simply hashes to other blocks.
 */
class Block {

    /**
     *
     * @param {Buffer} data
     * @param {[]} [links]
     */
    constructor(data, links = []) {
        this.data = data || '';
        this.links = links || [];
        this.computedHash = '';
    }

    /**
     * Serializes the block in an unambiguous way.
     */
    toJSON() {
        return [ this.data.toString('utf8') ].concat(this.links);
    }

    toString() {
        return JSON.stringify(this);
    }

    hash() {
        return this.computedHash = crypto.createHash('sha256').update(this.toString()).digest('hex');
    }

    static fromString(contents) {

        const [ data, ...links ] = JSON.parse(contents);
        return new this(data, links);
    }
}

module.exports = Block;