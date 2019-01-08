const { Writable } = require('stream');
const ONLY = Symbol('only');
const CHUNK_INDEX = Symbol('chunk index');
const ONLY_INDEX = Symbol('only index');
const ALL = Symbol('all');
const REMAINING = Symbol('remaining');
const FOR_EACH_CALLBACK = Symbol('for-each callback');
const SEND = Symbol('send');

const { SIZE } = require('./PartialValue');

class PartialValueWriteStream extends Writable {

    constructor(only = [], forEachCallback = () => Promise.resolve(), streamOptions = { decodeStrings: false }) {

        super(streamOptions);

        this[ONLY] = (only || []).sort();
        this[CHUNK_INDEX] = 0;
        this[ONLY_INDEX] = 0;
        this[ALL] = this[ONLY].length === 0;
        this[REMAINING] = '';
        this[FOR_EACH_CALLBACK] = forEachCallback;
    }

    [SEND](chunk) {

        const index = this[CHUNK_INDEX];
        this[CHUNK_INDEX]+= SIZE;

        if (this[ALL] || this[ONLY][this[ONLY_INDEX]] === index) {
            this[ONLY_INDEX]++;
            return this[FOR_EACH_CALLBACK](chunk, index);
        }
        return Promise.resolve();
    }

    _write(chunk, encoding, callback) {

        let data = this[REMAINING] + chunk;
        this[REMAINING] = '';

        Promise.resolve()
            .then(() => {

                const toSend = [];

                while (data) {

                    chunk = data.substring(0, SIZE);
                    data = data.substring(SIZE);

                    if (chunk.length < SIZE) {
                        this[REMAINING] = chunk;
                    } else {
                        toSend.push(chunk);
                    }
                }

                if (!toSend.length) {
                    return;
                }

                return Promise.all(toSend.map(chunk => this[SEND](chunk)));
            })
            .then(() => callback())
            .catch(callback);
    }

    _final(callback) {

        if (!this[REMAINING]) {
            return callback();
        }

        this[SEND](this[REMAINING]).then(() => callback()).catch(callback);
    }
}

module.exports = PartialValueWriteStream;