const { Readable, Writable } = require('stream');
const _Store = require('../../BlockStorage');
const InvalidBlockError = require('../../../errors/InvalidBlockError');
const BlockNotFoundError = require('../../../errors/BlockNotFoundError');
const Block = require('../../../Block');

/**
 * An implementation of Store that uses memory.
 * Useful for testing.
 */
class MemoryBlockStorage extends _Store {

    constructor() {
        super();
        this.blocks = {};
        this.hashLists = {};
    }

    /**
     * Gets the block associated with this hash.
     *
     * @param {string} hash
     * @returns {Promise<Block>}
     */
    fetch(hash) {

        return this.blocks[hash] ? Promise.resolve(this.blocks[hash]) : Promise.reject(new BlockNotFoundError());
    }

    fetchStream(hash) {

        let iterator = 0;
        const data = this.blocks[hash] ? JSON.stringify(this.blocks[hash]) : null;

        return new Readable({
            read(size) {

                if (!data) {
                    return this.emit('error', new BlockNotFoundError());
                }
                const chunk = data.substring(iterator, size);
                iterator+= size;
                this.push(chunk || null);
            }
        });
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

    saveStream(hash) {

        let data = '';

        new Writable({
            write(chunk, encoding, callback) {
                data+= chunk.toString();
                callback();
            },
            final(callback) {

                const block = new Block(Buffer.from(data));
                if (block.hash() !== hash) {
                    return callback(new InvalidBlockError());
                }
                this.blocks[hash] = block;
                callback();
            }
        });
    }

    exists(hash) {
        return Promise.resolve(!!this.blocks[hash]);
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

    /**
     * Removes/cleans up the hash list.
     *
     * @param {*} hashListId
     * @returns {Promise}
     */
    removeHashList(hashListId) {
        delete this.hashLists[hashListId];
        return Promise.resolve();
    }

}

module.exports = MemoryBlockStorage;
