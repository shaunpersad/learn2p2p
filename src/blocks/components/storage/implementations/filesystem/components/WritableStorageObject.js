const fs = require('fs');
const { Writable } = require('stream');

const SOURCE = Symbol('source');
const STORAGE_OBJECT = Symbol('storage object');

/**
 * Wraps a writable stream of a file,
 * in order to keep track of the length of data being written.
 */
class WritableStorageObject extends Writable {

    constructor(path, start, storageObject, streamOptions) {

        super(streamOptions);
        this[STORAGE_OBJECT] = storageObject;
        this[STORAGE_OBJECT].length = start;
        this[SOURCE] = fs.createWriteStream(path, { flags: 'r+', start });
        this[SOURCE].on('error', err => this.emit('error', err));
    }

    _write(chunk, encoding, callback) {

        this[STORAGE_OBJECT].length+= chunk.length; // update the storage object's length
        this[SOURCE].write(chunk, encoding, () => callback());
    }

    _final(callback) {
        this[SOURCE].end();
        callback();
    }
}

module.exports = WritableStorageObject;