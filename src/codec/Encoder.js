const { Transform } = require('stream');
const Block = require('./Block');
const MemoryBlockStore = require('../block-store/MemoryBlockStore');

const OPTIONS = Symbol('options');
const HASHES = Symbol('hashes');

/**
 * Converts some input stream into a final hash representing its contents.
 * e.g. If file contents are streamed in, it will convert it to a hash representing those contents.
 * It handles the creation of the underlying blocks (and their links to other blocks),
 * where each block represents a chunk of the contents.
 */
class Encoder extends Transform {

    constructor(options = { blockStore: new MemoryBlockStore(), maxNumLinks: 2, streamOptions: null }) {
        super(options.streamOptions);
        this[OPTIONS] = options;
        this[HASHES] = [];
    }

    /**
     * For each chunk of data that comes in, create and save a block representing that chunk.
     */
    _transform(data, encoding, callback) {

        const { blockStore } = this[OPTIONS];

        blockStore
            .save(new Block(data))
            .then(hash => {

                this[HASHES].push(hash); // keep track of each block's hash in an ordered list.

                callback();
            })
            .catch(callback);
    }

    /**
     * Once all chunks have been received,
     * we now want to walk backwards through our stack of hashes,
     * in order to link child blocks to their parents.
     */
    _flush(callback) {

        const { blockStore, maxNumLinks } = this[OPTIONS];
        const hashes = this[HASHES]; // acts as a stack

        if (!hashes.length) {
            return callback();
        }

        const makeLinks = () => {

            const links = [];

            /**
             * As long as we aren't yet at the root hash, and we've not yet hit the link limit,
             * create links from the hashes at the end of the hash list.
             */
            while (hashes.length > 1 && links.length < maxNumLinks) {
                links.unshift(hashes.pop());
            }
            /**
             * Once we've created as many links as we can,
             * the next hash is the hash of the block that will become the parent to those links.
             * Note that when we update our block, its original hash will become invalid.
             * The block's content fundamentally changes once we've modified it by adding links,
             * resulting in a new hash.
             */
            const hash = hashes.pop();

            return blockStore
                .fetch(hash)
                .then(block => {

                    block.links = links;

                    return blockStore.update(block, hash); // update the block with its new links
                })
                .then(hash => { // this hash and is not necessarily equivalent to the block's original hash!

                    if (!hashes.length) { // there are no more hashes to process
                        return Promise.resolve(hash); // this hash is the root block's hash
                    }

                    /**
                     * Put the hash of the updated block back on the stack,
                     * to be used as a link in an even higher parent's block.
                     */
                    hashes.push(hash);

                    return makeLinks();
                });
        };

        makeLinks()
            .then(hash => {

                this.push(hash); // stream out the root hash

                callback();
            })
            .catch(callback);
    }
}

module.exports = Encoder;
