const BlockStore = require('./BlockStore');

/**
 * An implementation of BlockStore that uses memory.
 * Useful for testing.
 */
class MemoryBlockStore extends BlockStore {

    constructor() {
        super();
        this.blocks = {};
    }

    /**
     * Gets the block associated with this hash.
     * @param {string} hash
     * @returns {Promise<Block>}
     */
    fetch(hash) {

        return Promise.resolve(this.blocks[hash]);
    }

    /**
     * Saves a block by its hash.
     *
     * @param {Block} block
     * @returns {Promise<string>}
     */
    save(block) {

        const hash = block.hash();
        this.blocks[hash] = block;
        return Promise.resolve(hash);
    }

    /**
     * Updates a block and removes its old entry.
     *
     * @param {Block} block
     * @param {string} oldHash
     * @returns {Promise<string>}
     */
    update(block, oldHash) {

        delete this.blocks[oldHash];
        return this.save(block);
    }
}

module.exports = MemoryBlockStore;
