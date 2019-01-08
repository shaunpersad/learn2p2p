const { Readable } = require('stream');

const SOURCE = Symbol('source');

class WrappedReadStream extends Readable {

    constructor(source, errorTransform = err => err, streamOptions) {

        super(streamOptions);
        this[SOURCE] = source;
        this[SOURCE].on('data', data => { // forward the source stream to this stream
            if (!this.push(data)) {
                this[SOURCE].pause();
            }
        });
        this[SOURCE].on('error', err => {

            this.emit('error', errorTransform(err)); // forward the source's error as if it were this stream's error.
        });
        this[SOURCE].on('end', () => this.push(null));
    }

    _read() {
        this[SOURCE].resume();
    }
}

module.exports = WrappedReadStream;