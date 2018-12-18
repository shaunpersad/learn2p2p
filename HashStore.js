const crypto = require('crypto');

class HashMisMatchError extends Error {

    constructor(message = 'Returned block does not match this hash.') {

        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * A simple class to store blocks.
 * It is asynchronous, so it may be replaced
 * with more robust solutions that utilize the file system,
 * or a database.
 */
class BlockStore {

    constructor(hashFn = block => crypto.createHash('md5').update(block.toString()).digest('hex')) {
        this.hashFn = hashFn;
        this.blocks = {};
    }

    /**
     * Gets the block associated with this hash.
     * @param {string} hash
     * @returns {Promise<Block>}
     */
    get(hash) {
        return Promise.resolve(this.blocks[hash]).then(block => {

            if (this.hashFn(block) !== hash) {
                throw new this.constructor.HashMisMatchError();
            }
            return block;
        });
    }

    /**
     * Saves a block by its hash.
     *
     * @param {Block} block
     * @returns {Promise<string>}
     */
    set(block) {
        const hash = this.hashFn(block);
        this.blocks[hash] = block;
        return Promise.resolve(hash);
    }

    /**
     * Gets all blocks.
     *
     * @returns {Promise<{}>}
     */
    all() {
        return Promise.resolve(this.blocks);
    }

    static get HashMisMatchError() {
        return HashMisMatchError;
    }
}

module.exports = BlockStore;
