/**
 * A simple class to store blocks.
 * It is asynchronous, so it may be replaced
 * with more robust solutions that utilize the file system or a database.
 */
class BlockStore {

    /**
     * Gets the block associated with this hash.
     * @param {string} hash
     * @returns {Promise<Block>}
     */
    fetch(hash) {
        throw new Error('Please override the fetch(hash) method.');
    }

    /**
     * Removes the block associated with this hash.
     *
     * @param hash
     * @returns {Promise<Block>}
     */
    fetchAndForget(hash) {
        throw new Error('Please override the fetchAndForget(hash) method.');
    }

    /**
     * Saves a block by its hash.
     *
     * @param {Block} block
     * @returns {Promise<string>}
     */
    save(block) {
        throw new Error('Please override the save(block) method.');
    }

    /**
     * Updates a block and removes its old entry.
     *
     * @param {Block} block
     * @param {string} oldHash
     * @returns {Promise<string>}
     */
    update(block, oldHash) {
        throw new Error('Please override the update(block, oldHash) method.');
    }
}

module.exports = BlockStore;
