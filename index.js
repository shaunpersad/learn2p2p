const crypto = require('crypto');
const MAX_DATA_LENGTH = 65;
const HASH_LENGTH = 32;
const MAX_NUM_LINKS = Math.floor(MAX_DATA_LENGTH / HASH_LENGTH);
const hashes = {};
const content = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque interdum rutrum sodales. Nullam mattis fermentum libero, non volutpat. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque interdum rutrum sodales. Nullam mattis fermentum libero, non volutpat.';

/**
 * Blocks encapsulate a chunk of data (up to MAX_DATA_LENGTH),
 * and any links needed to get to the rest of it beyond MAX_DATA_LENGTH.
 * Links are simply hashes to other blocks.
 */
class Block {

    constructor(data = '') {
        this.data = data.substring(0, MAX_DATA_LENGTH);
        this.links = [];
    }

    /**
     * Serializes the block in an unambiguous way.
     */
    toJSON() {
        return [ this.data ].concat(this.links);
    }

    /**
     * Creates a hash of this block,
     * saves the data as hash => block,
     * and returns the hash.
     */
    hash() {
        const serializedBlock = JSON.stringify(this);
        const hash = crypto.createHash('md5').update(serializedBlock).digest('hex');
        hashes[hash] = this;
        return hash;
    }

    /**
     * Converts a string into a block and returns its hash.
     * It recursively creates links as necessary.
     * This algorithm tries to create as many "data-heavy" blocks as possible,
     * rather than "link-heavy".
     */
    static encode(data) {

        const block = new this(data);

        while (data = data.substring(MAX_DATA_LENGTH)) {

            if (block.links.length < MAX_NUM_LINKS - 1) {

                const linkedBlock = new this(data);
                block.links.push(linkedBlock.hash());

            } else {

                block.links.push(this.encode(data));
                break;
            }
        }

        return block.hash();
    }

    /**
     * Converts a hash to the original string content.
     * It does this by walking the blocks and concatenating their data.
     *
     */
    static decode(hash) {

        const block = hashes[hash];

        if (block.hash() !== hash) {
            throw new Error('Hashes do not match.');
        }

        const { data, links } = block;

        return links.reduce((content, hash) => {

            return content + this.decode(hash);

        }, data);
    }
}

const hash = Block.encode(content);
const decoded = Block.decode(hash);

console.log({ equals: content === decoded, hash, hashes });