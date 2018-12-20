const { Transform } = require('stream');
const MemoryBlockStore = require('../block-store/MemoryBlockStore');

const OPTIONS = Symbol('options');

/**
 * A transform stream that converts a hash representing a file's contents
 * to stream of those contents in the proper order.
 * This output stream can then be used to reassemble the file.
 */
class Decoder extends Transform {

    constructor(options = { blockStore: new MemoryBlockStore(), streamOptions: null }) {
        super(options.streamOptions);
        this[OPTIONS] = options;
    }

    _transform(hash, encoding, callback) {

        const { blockStore } = this[OPTIONS];
        const hashes = [ hash ]; // acts as a queue of hashes to blocks

        /**
         * Fetches a block and streams out its data.
         * As long as there is a hash in the queue above,
         * this will recursively call itself to continue the stream.
         */
        const fetch = () => {

            return blockStore
                .fetch(hashes.shift())
                .then(block => {

                    this.push(block.data); // stream out the block's data

                    hashes.push(...block.links); // add it's links (if any) to the queue

                    if (hashes.length) { // if there are more hashes, keep fetching
                        return fetch();
                    }
                });
        };

        fetch().then(() => callback()).catch(callback);
    }
}

module.exports = Decoder;

