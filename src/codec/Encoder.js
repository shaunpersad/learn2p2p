const { Transform } = require('stream');
const Block = require('./Block');

const BLOCK_STORE = Symbol('block store');
const MAX_NUM_LINKS = Symbol('max num links');
const LINKS = Symbol('links');

/**
 * A transform stream that converts some input stream into a final hash representing its contents.
 * e.g. If file contents are streamed in, it will convert it to a hash representing those contents.
 * It handles the creation of the underlying blocks (and their links to other blocks),
 * where each block represents a chunk of the contents.
 *
 * This algorithm builds our Merkle DAG of blocks in reverse, meaning that the root node
 * actually contains the very last chunk of data we received.
 *
 * To reassemble the contents in the correct order, start at the root,
 * and prepend (instead of append) subsequent link data.
 */
class Encoder extends Transform {

    constructor(blockStore, maxNumLinks, streamOptions) {
        super(streamOptions);
        this[BLOCK_STORE] = blockStore;
        this[MAX_NUM_LINKS] = maxNumLinks;
        this[LINKS] = [];
    }

    /**
     * For each chunk of data that comes in, create and save a block representing that chunk.
     * We will build up an array of links, and assign them to blocks as the array is filled up.
     *
     */
    _transform(data, encoding, callback) {

        const block = new Block(data);
        const maxLinks = this[LINKS].length === this[MAX_NUM_LINKS];

        if (maxLinks) { // max links reached, so assign them to this block.
            block.links = this[LINKS];
        }

        return this[BLOCK_STORE]
            .save(block)
            .then(hash => {

                if (maxLinks) {
                    this[LINKS] = [ hash ]; // begin another list
                } else {
                    this[LINKS].unshift(hash); // add to existing list
                }

                callback();
            })
            .catch(callback);
    }

    /**
     * At the end of the stream,
     * whichever hash is left on the list of links at position 0
     * is our root block.
     */
    _flush(callback) {

        const hash = this[LINKS].shift();

        if (!this[LINKS].length) {

            this.push(hash);
            return callback();
        }

        /**
         * We want to assign whatever links are left over to
         * our root block.
         */
        this[BLOCK_STORE]
            .fetch(hash)
            .then(block => {

                block.links = this[LINKS];

                return this[BLOCK_STORE].update(block, hash);
            })
            .then(hash => {

                this.push(hash);

                callback();
            })
            .catch(callback);

    }
}

module.exports = Encoder;

