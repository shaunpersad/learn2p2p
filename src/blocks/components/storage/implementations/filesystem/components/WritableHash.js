const fs = require('fs');
const { Writable } = require('stream');

const BlockExistsError = require('../../../../errors/BlockExistsError');

const SOURCE = Symbol('source');

class WritableHash extends Writable {

    constructor(path, streamOptions) {

        super(streamOptions);
        this[SOURCE] = fs.createWriteStream(path, { flags: 'wx' });
        this[SOURCE].on('error', err => {

            if (err.code === 'EEXIST') {
                err = new BlockExistsError();
            }
            this.emit('error', err);
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

