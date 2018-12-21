/**
 * A simple class to store blocks.
 * It is asynchronous, so it may be replaced
 * with more robust solutions that utilize the file system or a database.
 */
class BlockStore {

    /**
     * Gets the block associated with this hash.
     *
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

    /**
     * Maintains a list of hashes for blocks.
     * If no hash list id is supplied,
     * a new one is created.
     *
     * Returns the id of the list.
     *
     * @param {string} hash
     * @param {*|null} [hashListId]
     * @returns {Promise<*>}
     */
    pushToHashList(hash, hashListId = null) {
        throw new Error('Please override the pushToHashList(hash[, hashListId]) method.');
    }

    /**
     * Removes items from the hash list and returns it.
     *
     * @param {*} hashListId
     * @param {number} [amount]
     * @returns {Promise<[string]>}
     */
    pullFromHashList(hashListId, amount = 1) {
        throw new Error('Please override the pullFromHashList(hashListId[, amount]) method.');
    }

    /**
     * Removes/cleans up the hash list.
     *
     * @param {*} hashListId
     * @returns {Promise}
     */
    removeHashList(hashListId) {
        throw new Error('Please override the removeHashList(hashListId) method.');
    }
}

module.exports = BlockStore;
