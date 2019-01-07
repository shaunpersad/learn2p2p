const { Readable } = require('stream');
const CONTENT = Symbol('content');

class StringStream extends Readable {

    constructor(content, streamOptions) {
        super(streamOptions);
        this[CONTENT] = content;
    }

    _read(size) {

        while(this[CONTENT] && this.push(this[CONTENT].substring(0, size))) {
            this[CONTENT] = this[CONTENT].substring(size);
        }
        if (!this[CONTENT]) {
            this.push(null);
        }
    }
}

module.exports = StringStream;
