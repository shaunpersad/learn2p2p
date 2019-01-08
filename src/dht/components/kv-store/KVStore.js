const { Readable, Writable } = require('stream');
const StringStream = require('../../../utils/StringStream');
const Value = require('./components/Value');
const PartialValue = require('./components/PartialValue');
const PartialValueWriteStream = require('./components/PartialValueWriteStream');

class KVStore {

    createDataReadStream(key, streamOptions = null) {

        return new Readable(streamOptions);
    }

    createDataWriteStream(key) {

        return new Writable();
    }

    createPartialValue(key, length) {

        return Promise.resolve(new PartialValue(key, length));
    }

    /**
     *
     * @param {string} key
     * @returns {Promise<Value>}
     */
    getValue(key) {

        return Value.createFromReadStream(this.createDataReadStream(key));
    }

    saveRawValueData(key, data) {

        return new Promise((resolve, reject) => {

            (new StringStream(data))
                .on('error', reject)
                .pipe(this.createDataWriteStream(key))
                .on('error', reject)
                .on('finish', resolve);
        });
    }

    forEachPartialValueChunk(key, only, forEachCallback) {

        return new Promise((resolve, reject) => {

            this.createDataReadStream(key)
                .on('error', reject)
                .pipe(new PartialValueWriteStream(only, forEachCallback))
                .on('error', reject)
                .on('finish', resolve);
        });
    }
}

module.exports = KVStore;