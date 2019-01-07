const StringStream = require('../../../../../utils/StringStream');
const Value = require('../../components/Value');
const PartialValue = require('../../components/PartialValue');
const PartialValueWriteStream = require('../../components/PartialValueWriteStream');
const MemoryPartialValue = require('./components/MemoryPartialValue');
const KVStore = require('../../KVStore');

class MemoryKVStore extends KVStore {

    constructor() {
        super();
        this.memory = {};
    }

    getValue(key) {

        if (!this.memory[key]) {
            return Promise.resolve(null);
        }

        const type = this.memory[key].length > PartialValue.SIZE ? Value.TYPE_PARTIAL : Value.TYPE_RAW;
        const data = type === Value.TYPE_RAW ? this.memory[key] : this.memory[key].length;

        return Promise.resolve(new Value(type, data));
    }

    createPartialValue(key, length) {

        return Promise.resolve(new MemoryPartialValue(key, length, this.memory));
    }

    forEachValueChunk(key, only, forEachCallback) {

        return new Promise((resolve, reject) => {

            if (!this.memory[key]) {
                return reject(new Error('Value for this key does not exist.'));
            }

            (new StringStream(this.memory[key]))
                .on('error', reject)
                .pipe(new PartialValueWriteStream(only, forEachCallback))
                .on('error', reject)
                .on('finish', resolve);
        });
    }
}

module.exports = MemoryKVStore;
