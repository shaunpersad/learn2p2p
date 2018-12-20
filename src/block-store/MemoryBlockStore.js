const BlockStore = require('./BlockStore');

/**
 * An implementation of BlockStore that uses memory.
 * Useful for testing.
 */
class MemoryBlockStore extends BlockStore {

    constructor() {
        super();
        this.blocks = {};
        this.hashLists = {};
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

        if (!hashListId) {
            hashListId = Symbol();
            this.hashLists[hashListId] = [];
        }

        this.hashLists[hashListId].push(hash);

        return Promise.resolve(hashListId);
    }

    /**
     * Removes items from the hash list and returns it.
     *
     * @param {*} hashListId
     * @param {number} [amount]
     * @returns {Promise<[string]>}
     */
    pullFromHashList(hashListId, amount = 1) {

        if (!hashListId) {
            return Promise.resolve([]);
        }

        const hashList = [];
        while (amount && this.hashLists[hashListId].length) {
            hashList.unshift(this.hashLists[hashListId].pop());
            amount--;
        }

        return Promise.resolve(hashList);
    }

}

module.exports = MemoryBlockStore;
