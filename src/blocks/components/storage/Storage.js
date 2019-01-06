const { Readable } = require('stream');
const Block = require('../../Block');

/**
 * ABSTRACT CLASS
 *
 * This represents the entity that stores and retrieves block data.
 * You should be able to create new blocks, stream block data,
 * and check if a block exists.
 */
class Storage {


    /**
     * @param {string|null} [intendedHash]
     * @returns {Promise<Block>}
     */
    createNewBlock(intendedHash = null) {

        return Promise.resolve(new Block());
    }

    /**
     * @param {string} hash
     * @returns {Readable}
     */
    createBlockReadStream(hash) {

        return new Readable();
    }

    /**
     * @param {string} hash
     * @returns {Promise<boolean>}
     */
    blockExists(hash) {

        return Promise.resolve(false);
    }
}

module.exports = Storage;
