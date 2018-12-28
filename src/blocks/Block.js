const crypto = require('crypto');
const { Transform } = require('stream');

const InvalidBlockError = require('./errors/InvalidBlockError');

const HASH = Symbol('hash');
const LINKS = Symbol('links');
const LENGTH = Symbol('length');

const STATE_DATA = Symbol('data state');
const STATE_LINKS = Symbol('links state');

class Block {

    static createHash() {

        return crypto.createHash('sha256');
    }

    static createHashStream() {

        const SIZE = this.SIZE;
        const hash = this.createHash();
        const links = [];
        let state = STATE_DATA;
        let currentHash = '';
        let length = 0;

        return new Transform({
            transform(chunk, encoding, callback) {

                hash.update(chunk);
                length+= chunk.length;

                [...chunk.toString('utf8')].forEach(c => {

                    switch(state) {
                        case STATE_DATA:
                            if (c === '\n') {
                                state = STATE_LINKS;
                            }
                            break;
                        case STATE_LINKS:
                            if (c === '\n') {
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

    static get HASH_HEX_SIZE() {
        return 64;
    }

    static get SIZE() {
        return 160;
    }

    static get MAX_NUM_LINKS() {
        return 2;
    }

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