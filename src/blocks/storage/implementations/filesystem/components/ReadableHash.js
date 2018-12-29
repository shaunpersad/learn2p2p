const fs = require('fs');
const { Readable } = require('stream');

const BlockNotFoundError = require('../../../../errors/BlockNotFoundError');

const SOURCE = Symbol('source');

class ReadableHash extends Readable {

    constructor(path, streamOptions) {

        super(streamOptions);
        this[SOURCE] = fs.createReadStream(path);
        this[SOURCE].on('data', data => {
            if (!this.push(data)) {
                this[SOURCE].pause();
            }
        });
        this[SOURCE].on('error', err => {

            if (err.code === 'ENOENT') {
                err = new BlockNotFoundError();
            }
            this.emit('error', err);
        });
        this[SOURCE].on('end', () => this.push(null));
    }


    _read() {
        this[SOURCE].resume();
    }
}

module.exports = ReadableHash;
