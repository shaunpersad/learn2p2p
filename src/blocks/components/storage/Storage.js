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
     * @param {{}|null} [streamOptions]
     * @returns {Readable}
     */
    createBlockReadStream(hash, streamOptions = null) {

        return new Readable(streamOptions);
    }

    /**
     * @param {string} hash
     * @returns {Promise<number>}
     */
    getBlockLength(hash) {
        return Promise.resolve(0);
    }
}

module.exports = Storage;
