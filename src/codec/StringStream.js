const { Readable } = require('stream');
const CONTENT = Symbol('content');

/**
 * Helps stream strings.
 * In most applications this will not be necessary since the stream will come from either a file
 * or a network request.
 */
class StringStream extends Readable {

    constructor(content, streamOptions) {
        super(streamOptions);
        this[CONTENT] = content;
    }

    _read(size) {

        this.push(this[CONTENT].substring(0, size));

        if (!(this[CONTENT] = this[CONTENT].substring(size))) {
            this.push(null);
        }
    }
}

module.exports = StringStream;
