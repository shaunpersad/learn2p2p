const crypto = require('crypto');
const { Transform } = require('stream');

const InvalidBlockError = require('./components/errors/InvalidBlockError');

const HASH = Symbol('hash');
const LINKS = Symbol('links');
const LENGTH = Symbol('length');

const STATE_DATA = Symbol('data state');
const STATE_LINKS = Symbol('links state');

/**
 * Blocks are pieces of data + links to other data.
 * They are identified by a hash of their contents.
 * This is the basis of being content-addressable,
 * since the address of a block is a direct result of its contents.
 * This allows for easy verification when blocks are downloaded,
 * since their contents can easily be hashed and compared to the hash of the block you requested.
 *
 * Blocks have a particular maximum size, therefore in order to reassemble a large file from its blocks,
 * simply read the data portion of the block, then follow its links
 * (which are hashes - and therefore addresses of other blocks) in order to get to the subsequent blocks, then repeat.
 * Do this recursively until there are no more links to follow.
 *
 * Our particular implementation of blocks are formatted as text, with its base64-encoded data portion first,
 * followed by each link on a new line.
 *
 * e.g.:
 * thisissomebase64encodeddata
 * link1
 * link2
 *
 */
class Block {

    /**
     * This is only here for descriptive purposes.
     * We never explicitly create Block objects.
     * Instead, we create blocks in a streaming fashion.
     */
    constructor() {
        this.data = '';
        this.links = [];
    }

    /**
     * All hashes are created using SHA256.
     *
     * @returns {crypto.Hash}
     */
    static createHash() {

        return crypto.createHash('sha256');
    }

    /**
     * This creates a "pass-through" stream,
     * which simply collects a block's metadata
     * as its contents are passed through.
     *
     * The metadata returned are its hash, links, and length.
     * We can get this metadata from the stream after it is complete
     * by accessing the relevant properties from the stream object.
     *
     * @returns {stream.Transform}
     */
    static extractMetadata() {

        const SIZE = this.SIZE;
        const hash = this.createHash();
        const links = [];
        let state = STATE_DATA;
        let currentHash = '';
        let length = 0;

        return new Transform({
            transform(chunk, encoding, callback) {

                hash.update(chunk); // continuously update the hash
                length+= chunk.length; // record the overall length

                [...chunk.toString('utf8')].forEach(c => {

                    switch(state) {
                        case STATE_DATA:
                            if (c === '\n') { // wait for the first new line to begin looking at links
                                state = STATE_LINKS;
                            }
                            break;
                        case STATE_LINKS:
                            if (c === '\n') { // we've reached the end of a link
                                links.push(currentHash);
                                currentHash = '';
                            } else {
                                currentHash+= c;
                            }
                            break;
                    }
                });

                callback(null, chunk);
            },
            flush(callback) {

                if (length > SIZE) {
                    return callback(new InvalidBlockError(`Data must be a maximum of ${SIZE} bytes.`));
                }

                if (currentHash) {
                    links.push(currentHash);
                }

                this[HASH] = hash.digest('hex');
                this[LINKS] = links;
                this[LENGTH] = length;
                callback();
            }
        });
    }

    /**
     * Every hash is 64 bytes long (in hex).
     */
    static get HASH_HEX_SIZE() {
        return 64;
    }

    /**
     * Every block is a maximum of 160 bytes.
     */
    static get SIZE() {
        return 160;
    }

    /**
     * Sets the maximum number of links a block can have.
     */
    static get MAX_NUM_LINKS() {
        return 2;
    }

    /**
     * Below are the accessors to use on the extractMetadata stream
     * in order to retrieve its metadata.
     */

    static get HASH() {
        return HASH;
    }

    static get LINKS() {
        return LINKS;
    }

    static get LENGTH() {
        return LENGTH;
    }
}

module.exports = Block;