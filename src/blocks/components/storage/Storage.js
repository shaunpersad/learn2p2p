const { Readable } = require('stream');
const Block = require('../../Block');

/**
 * ABSTRACT CLASS
 *
 * This represents the entity that stores and retrieves blocks.
 * You should be able to create new blocks, fetch blocks,
 * and check if a block exists.
 */
class Storage {

    /**
     * @returns {Promise<Block>}
     */
    createNewBlock() {

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
