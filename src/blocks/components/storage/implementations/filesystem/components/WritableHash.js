const fs = require('fs');
const { Writable } = require('stream');

const BlockExistsError = require('../../../../errors/BlockExistsError');

const SOURCE = Symbol('source');

/**
 * Wraps a writable stream of a file,
 * in order to better control the error type if the file already exists.
 */
class WritableHash extends Writable {

    constructor(path, streamOptions) {

        super(streamOptions);
        this[SOURCE] = fs.createWriteStream(path, { flags: 'wx' });
        this[SOURCE].on('error', err => {

            if (err.code === 'EEXIST') { // if the file exists, throw our own BlockExistsError error.
                err = new BlockExistsError();
            }
            this.emit('error', err); // forward the source's error as if it were this stream's error.
        });
    }

    _write(chunk, encoding, callback) {

        this[SOURCE].write(chunk, encoding, () => callback());
    }

    _final(callback) {
        this[SOURCE].end();
        callback();
    }
}

module.exports = WritableHash;

