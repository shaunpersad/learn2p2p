const { Readable } = require('stream');
const HASHES = Symbol('hashes');
const STORAGE = Symbol('storage');
const SOURCE = Symbol('readable');
const STATE = Symbol('state');
const CURRENT_HASH = Symbol('incomplete hash');
const MAKE_READ_STREAM = Symbol('make read stream');

const STATE_DATA = Symbol('data state');
const STATE_LINKS = Symbol('links state');

/**
 * Stitches the data of an entire file together by walking its blocks starting at it's root block,
 * following its links, and pumping out each data segment it finds.
 *
 * It utilizes a queue to store the hashes of the links it finds, which preserves the proper order
 * of the blocks it should look at. Each time a block has been finished reading,
 * another hash is pulled out of the queue, its block fetched,
 * and the process continues until there are no more blocks to read.
 */
class DataStitcher extends Readable {

    constructor(hash, storage, streamOptions) {

        super(streamOptions);

        this[CURRENT_HASH] = hash;
        this[HASHES] = [];
        this[STORAGE] = storage;
        this[STATE] = STATE_DATA;
        this[SOURCE] = null;
        this[MAKE_READ_STREAM]();
    }

    [MAKE_READ_STREAM]() {

        if (this[CURRENT_HASH]) {
            this[HASHES].push(this[CURRENT_HASH]);
        }

        const hash = this[HASHES].shift();

        if (!hash) {
            return this.push(null);
        }

        this[STATE] = STATE_DATA;
        this[CURRENT_HASH] = '';
        this[SOURCE] = this[STORAGE].createBlockReadStream(hash);
        this[SOURCE].setEncoding('utf8');
        this[SOURCE].on('error', err => this.emit('error', err));
        this[SOURCE].on('end', () => this[MAKE_READ_STREAM]());
        this[SOURCE].on('data', chunk => {

            let data = '';

            [...chunk].forEach(c => {

                switch(this[STATE]) {
                    case STATE_DATA:
                        if (c === '\n') {
                            this[STATE] = STATE_LINKS;
                        } else {
                            data+= c;
                        }
                        break;
                    case STATE_LINKS:
                        if (c === '\n') {
                            this[HASHES].push(this[CURRENT_HASH]);
                            this[CURRENT_HASH] = '';
                        } else {
                            this[CURRENT_HASH]+= c;
                        }
                        break;
                }
            });

            if (data && !this.push(data)) {
                this[SOURCE].pause();
            }
        });
    }

    _read() {

        this[SOURCE].resume();
    }
}

module.exports = DataStitcher;
