const fs = require('fs');
const { Writable } = require('stream');

const INITIALIZE_SOURCE = Symbol('initialize source');
const ON_WRITE = Symbol('on write');
const ON_END = Symbol('on end');
const SOURCE = Symbol('source');

const returnPromise = () => Promise.resolve();

/**
 * Wraps a writable stream of a file,
 * in order to keep track of the length of data being written.
 */
class WrappedWriteStream extends Writable {

    constructor(initializeSource, onWrite = returnPromise, onEnd = returnPromise, streamOptions) {

        super(streamOptions);
        this[INITIALIZE_SOURCE] = initializeSource;
        this[ON_WRITE] = onWrite;
        this[ON_END] = onEnd;
        this.id = Math.random();
    }

    _write(chunk, encoding, callback) {

        const getSource = this[SOURCE]
            ? Promise.resolve()
            : Promise.resolve()
                .then(() => this[INITIALIZE_SOURCE]())
                .then(source => {
                    this[SOURCE] = source;
                    this[SOURCE].on('error', err => this.emit('error', err));
                });

        getSource
            .then(() => new Promise(resolve => this[SOURCE].write(chunk, encoding, () => resolve())))
            .then(() => this[ON_WRITE](chunk, encoding))
            .then(() => callback());
    }

    _final(callback) {
        if (this[SOURCE]) {
            this[SOURCE].end();
        }
        this[ON_END]().then(() => callback()).catch(callback);
    }
}

module.exports = WrappedWriteStream;
