const fs = require('fs');
const { Writable } = require('stream');

const SOURCE = Symbol('source');
const BLOCK = Symbol('block');

/**
 * Wraps a writable stream of a file,
 * in order to keep track of the length of data being written.
 */
class BlockWriteStream extends Writable {

    constructor(path, start, block, streamOptions) {

        super(streamOptions);
        this[BLOCK] = block;
        this[BLOCK].length = start;
        this[SOURCE] = fs.createWriteStream(path, { flags: 'r+', start });
        this[SOURCE].on('error', err => this.emit('error', err));
    }

    _write(chunk, encoding, callback) {

        this[BLOCK].length+= chunk.length; // update the block's length
        this[SOURCE].write(chunk, encoding, () => callback());
    }

    _final(callback) {
        this[SOURCE].end();
        callback();
    }
}

module.exports = BlockWriteStream;