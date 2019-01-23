const crypto = require('crypto');
const { Readable, Writable } = require('stream');
const MetadataExtractor = require('./components/codec/components/MetadataExtractor');


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

    constructor() {
        this.length = 0;
    }

    /**
     * Returns a writable stream to block.
     *
     * @param {number} [start]
     * @returns {Writable}
     */
    createWriteStream(start = 0) {

        this.length = start;
        return new Writable();
    }

    /**
     * Returns a readable stream to the block.
     *
     * @param {number} [start] - inclusive
     * @param {number} [end] - exclusive
     * @returns {Readable}
     */
    createReadStream(start = 0, end = this.length) {

        return new Readable();
    }

    /**
     * Saves the block and returns its hash.
     *
     * @returns {Promise<string>}
     */
    save() {

        return Promise.resolve('');
    }

    /**
     * Destroys the block.
     *
     * @returns {Promise}
     */
    destroy() {
        return Promise.resolve();
    }

    /**
     *
     * @param {number} length
     * @returns {Promise<Block>} block
     */
    reserve(length) {

        this.length = length;
        return Promise.resolve(this);
    }

    free() {
        return Promise.resolve(this);
    }

    /**
     *
     * @param {Buffer|string} chunk
     * @param {number} index
     * @returns {Promise<void>}
     */
    writeToIndex(chunk, index) {

        return Promise.resolve();
    }

    /**
     *
     * @returns {Promise<{ hash: string, links: [], length: number }>}
     */
    getMetadata() {

        return new Promise((resolve, reject) => {

            const metadataExtractor = new MetadataExtractor();

            this.createReadStream()
                .on('error', reject)
                .pipe(metadataExtractor)
                .on('error', reject)
                .on('finish', () => resolve(metadataExtractor[MetadataExtractor.METADATA]));
        });
    }

    /**
     * All hashes are created using SHA256.
     *
     * @returns {Hash}
     */
    static createHash() {

        return crypto.createHash('sha256');
    }

    /**
     * Every block is a maximum of 160 bytes.
     */
    static get SIZE() {
        return 262144;
    }

    /**
     * Sets the maximum number of links a block can have.
     */
    static get MAX_NUM_LINKS() {
        return 10;
    }
}

module.exports = Block;