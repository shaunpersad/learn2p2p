const { Readable } = require('stream');
const HASHES = Symbol('hashes');
const STORAGE = Symbol('storage');
const SOURCE = Symbol('readable');
const STATE = Symbol('state');
const CURRENT_HASH = Symbol('incomplete hash');
const MAKE_READ_STREAM = Symbol('make read stream');

const STATE_DATA = Symbol('data state');
const STATE_LINKS = Symbol('links state');

class BlockStitcher extends Readable {

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

        try {
            this[STATE] = STATE_DATA;
            this[CURRENT_HASH] = '';
            this[SOURCE] = this[STORAGE].createReadStreamAtHash(hash);
            this[SOURCE].setEncoding('utf8');
            this[SOURCE].on('data', chunk => {

                let value = '';

                [...chunk].forEach(c => {

                    switch(this[STATE]) {
                        case STATE_DATA:
                            if (c === '\n') {
                                this[STATE] = STATE_LINKS;
                            } else {
                                value+= c;
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
                if (value && !this.push(value)) {
                    this[SOURCE].pause();
                }

            });
            this[SOURCE].on('end', () => this[MAKE_READ_STREAM]());

        } catch(err) {
            this.emit('error', err);
        }
    }

    _read() {

        this[SOURCE].resume();
    }
}

module.exports = BlockStitcher;
