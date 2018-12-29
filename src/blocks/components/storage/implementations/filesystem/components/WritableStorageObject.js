const fs = require('fs');
const { Writable } = require('stream');

const SOURCE = Symbol('source');
const STORAGE_OBJECT = Symbol('storage object');

class WritableStorageObject extends Writable {

    constructor(path, start, storageObject, streamOptions) {

        super(streamOptions);
        this[STORAGE_OBJECT] = storageObject;
        this[STORAGE_OBJECT].length = start;
        this[SOURCE] = fs.createWriteStream(path, { flags: 'r+', start });
        this[SOURCE].on('error', err => this.emit('error', err));
    }

    _write(chunk, encoding, callback) {

        this[STORAGE_OBJECT].length+= chunk.length;
        this[SOURCE].write(chunk, encoding, () => callback());
    }

    _final(callback) {
        this[SOURCE].end();
        callback();
    }
}

module.exports = WritableStorageObject;