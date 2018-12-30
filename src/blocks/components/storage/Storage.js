const { Readable, Writable } = require('stream');
const StorageObject = require('./components/StorageObject');

/**
 * ABSTRACT CLASS
 *
 * This represents the entity that stores and retrieves blocks.
 * You should be able to read blocks, create new blocks,
 * check if a block exists, and create "storage objects".
 *
 * Storage objects are simply empty spaces to put arbitrary data.
 * It's most equivalent to a temporary file.
 */
class Storage {

    /**
     * @returns {Promise<StorageObject>}
     */
    createStorageObject() {

        return Promise.resolve(new StorageObject());
    }

    /**
     * @param {string} hash
     * @returns {Readable}
     */
    createReadStreamAtHash(hash) {

        return new Readable();
    }

    /**
     * @param {string} hash
     * @returns {Writable}
     */
    createWriteStreamAtHash(hash) {

        return new Writable();
    }

    /**
     * @param {string} hash
     * @returns {Promise<boolean>}
     */
    exists(hash) {

        return Promise.resolve(false);
    }
}

module.exports = Storage;
