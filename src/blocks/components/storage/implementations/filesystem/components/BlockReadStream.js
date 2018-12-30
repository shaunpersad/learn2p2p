const fs = require('fs');
const { Readable } = require('stream');

const BlockNotFoundError = require('../../../../errors/BlockNotFoundError');

const SOURCE = Symbol('source');

/**
 * Wraps a readable stream of a file,
 * in order to better control the error type if the file does not exist.
 */
class BlockReadStream extends Readable {

    constructor(path, streamOptions) {

        super(streamOptions);
        this[SOURCE] = fs.createReadStream(path);
        this[SOURCE].on('data', data => { // forward the source stream to this stream
            if (!this.push(data)) {
                this[SOURCE].pause();
            }
        });
        this[SOURCE].on('error', err => {

            if (err.code === 'ENOENT') { // if the file does not exist, throw our own BlockNotFoundError error.
                err = new BlockNotFoundError();
            }
            this.emit('error', err); // forward the source's error as if it were this stream's error.
        });
        this[SOURCE].on('end', () => this.push(null));
    }


    _read() {
        this[SOURCE].resume();
    }
}

module.exports = BlockReadStream;
