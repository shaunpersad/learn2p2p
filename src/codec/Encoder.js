const { Transform } = require('stream');
const Block = require('../Block');

const BLOCK_STORE = Symbol('block store');
const MAX_LINKS_PER_BLOCK = Symbol('max links per block');
const HASH_LIST_ID = Symbol('hash list id');

/**
 * A transform stream that converts some input stream into a final hash representing its contents.
 * e.g. If file contents are streamed in, it will convert it to a hash representing those contents.
 * It handles the creation of the underlying blocks (and their links to other blocks),
 * where each block represents a chunk of the contents.
 */
class Encoder extends Transform {

    constructor(blockStore, maxLinksPerBlock, streamOptions) {
        super(streamOptions);
        this[BLOCK_STORE] = blockStore;
        this[MAX_LINKS_PER_BLOCK] = maxLinksPerBlock;
        this[HASH_LIST_ID] = null;
    }

    /**
     * For each chunk of data that comes in, create and save a block representing that chunk.
     * For each block that is created, we want to save its hash in a list unique to this stream.
     * We will later use this list to build our links.
     */
    _transform(data, encoding, callback) {

        const block = new Block(data);

        return this[BLOCK_STORE]
            .save(block)
            .then(hash => {

                return this[BLOCK_STORE].pushToHashList(hash, this[HASH_LIST_ID]);
            })
            .then(hashListId => {

                this[HASH_LIST_ID] = hashListId;
                callback();
            })
            .catch(callback);
    }

    /**
     * Now that all our blocks have been made, we need to link them up.
     *
     * To do this, we will pull the last MAX_LINKS_PER_BLOCK + 1
     * hashes from the list we were keeping.
     * We will use the first element of that list as the parent block,
     * and the rest will become its links.
     *
     * When we only have one hash in the list left,
     * we've reached the end. That's the root hash.
     *
     * Note: the blocks that we update with links will have changed their
     * hashes in the process, since a hash is determined by a block's content,
     * which has fundamentally changed by adding links to it.
     *
     */
    _flush(callback) {

        const link = () => {

            return this[BLOCK_STORE]
                .pullFromHashList(this[HASH_LIST_ID], this[MAX_LINKS_PER_BLOCK] + 1)
                .then(([ hash, ...links ]) => {

                    if (!links.length) { // no more links

                        return this.push(hash); // send the root hash
                    }

                    return this[BLOCK_STORE]
                        .fetch(hash)
                        .then(block => {

                            block.links = links;

                            return this[BLOCK_STORE].update(block, hash);
                        })
                        .then(updatedHash => {

                            return this[BLOCK_STORE].pushToHashList(updatedHash, this[HASH_LIST_ID]);
                        })
                        .then(() => link());
                });
        };

        link()
            .then(() => this[BLOCK_STORE].removeHashList(this[HASH_LIST_ID]))
            .then(() => (this[HASH_LIST_ID] = null))
            .then(() => callback())
            .catch(callback);
    }
}

module.exports = Encoder;

