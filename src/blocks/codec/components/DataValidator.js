const { Transform } = require('stream');
const Block = require('../../Block');
const InvalidBlockError = require('../../errors/InvalidBlockError');

const HASH = Symbol('hash');
const HASH_STREAM = Symbol('hash stream');
const LENGTH = Symbol('length');
const MAX_DATA_LENGTH = Symbol('max data length');

class DataValidator extends Transform {
    constructor(hash, maxDataLength = Infinity, streamOptions) {

        super(streamOptions);
        this[HASH] = hash;
        this[HASH_STREAM] = Block.createHash();
        this[LENGTH] = 0;
        this[MAX_DATA_LENGTH] = maxDataLength;
    }

    _transform(data, encoding, callback) {

        this[LENGTH]+= data.length;
        if (this[LENGTH] > this[MAX_DATA_LENGTH]) {
            return callback(new Error('Too much data.'));
        }
        this[HASH_STREAM].update(data);
        callback(null, data);
    }
    _flush(callback) {

        if (this[HASH_STREAM].digest('hex') !== this[HASH]) {
            return callback(new InvalidBlockError());
        }
        callback();
    }
}

module.exports = DataValidator;
