const { Transform } = require('stream');
const createHash = require('../../../../utils/createHash');
const InvalidBlockError = require('../../../components/errors/InvalidBlockError');
const Block = require('../../../Block');

const METADATA = Symbol('metadata');
const HASH = Symbol('hash');
const LINKS = Symbol('links');
const STATE = Symbol('state');
const CURRENT_HASH = Symbol('current hash');
const LENGTH = Symbol('length');

const STATE_DATA = Symbol('data state');
const STATE_LINKS = Symbol('links state');

/**
 * This creates a "pass-through" stream,
 * which simply collects a block's metadata
 * as its contents are passed through.
 *
 * The metadata returned are its hash, links, and length.
 * We can get this metadata from the stream after it is complete
 * by accessing the METADATA property from the stream object.
 *
 */
class MetadataExtractor extends Transform {

    constructor(streamOptions) {
        super(streamOptions);
        this[METADATA] = null;
        this[HASH] = createHash();
        this[LINKS] = [];
        this[STATE] = STATE_DATA;
        this[CURRENT_HASH] = '';
        this[LENGTH] = 0;
    }

    _transform(chunk, encoding, callback) {

        this[HASH].update(chunk); // continuously update the hash
        this[LENGTH]+= chunk.length; // record the overall length

        [...chunk.toString('utf8')].forEach(c => {

            switch(this[STATE]) {
                case STATE_DATA:
                    if (c === '\n') { // wait for the first new line to begin looking at links
                        this[STATE] = STATE_LINKS;
                    }
                    break;
                case STATE_LINKS:
                    if (c === '\n') { // we've reached the end of a link
                        this[LINKS].push(this[CURRENT_HASH]);
                        this[CURRENT_HASH] = '';
                    } else {
                        this[CURRENT_HASH]+= c;
                    }
                    break;
            }
        });

        callback(null, chunk);
    }

    _flush(callback) {

        if (this[LENGTH] > Block.SIZE) {
            return callback(new InvalidBlockError(`Data must be a maximum of ${Block.SIZE} bytes.`));
        }

        if (this[CURRENT_HASH]) {
            this[LINKS].push(this[CURRENT_HASH]);
        }

        this[METADATA] = {
            hash: this[HASH].digest('hex'),
            links: this[LINKS],
            length: this[LENGTH]
        };

        callback();
    }

    static get METADATA() {
        return METADATA;
    }
}

module.exports = MetadataExtractor;