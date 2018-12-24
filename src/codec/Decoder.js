const { Duplex } = require('stream');

const STORE = Symbol('block store');
const HASHES = Symbol('hashes');
const READ_FROM_WRITE = Symbol('read from write');

/**
 * A duplex stream that converts a hash representing a file's contents
 * to a stream of those contents (or blocks representing them).
 * This output stream can then be used to reassemble the file.
 */
class Decoder extends Duplex {

    constructor(store, streamOptions) {
        super(streamOptions);
        this[STORE] = store;
        this[HASHES] = null;
        this[READ_FROM_WRITE] = false;
    }


    /**
     * When we receive a hash, create a queue and add it to it.
     * On read, we will get hashes out of the queue to convert to blocks.
     */
    _write(hash, encoding, callback) {

        this[HASHES] = [ hash.toString('utf8') ];

        if (this[READ_FROM_WRITE]) { // don't force a read unless the stream previously tried to read
            this._read();
        }
        callback();

    }

    _read() {

        if (!this[HASHES]) {
            this[READ_FROM_WRITE] = true; // we tried to read but there was nothing available yet
            return;
        }

        if (!this[HASHES].length) { // no more hashes in the queue
            this[HASHES] = null;
            return this.push(null);
        }

        this[STORE]
            .fetch(this[HASHES].shift()) // get a hash from the queue and fetch its block
            .then(block => {

                this[HASHES].push(...block.links); // add it's links (if any) to the queue

                this.push(this._readableState.objectMode ? block : block.data); // push out the block (or its data)
            })
            .catch(err => {

                this.emit('error', err);
            });
    }

}

module.exports = Decoder;

