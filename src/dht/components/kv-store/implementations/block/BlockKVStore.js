const Value = require('../../components/Value');
const PartialValue = require('../../components/PartialValue');
const PartialValueWriteStream = require('../../components/PartialValueWriteStream');
const BlockPartialValue = require('./components/BlockPartialValue');
const KVStore = require('../../KVStore');

class BlockKVStore extends KVStore {

    constructor(storage) {
        super();
        this.storage = storage;
    }

    getValue(key) {

        return new Promise((resolve, reject) => {

            let currentChunk = null;
            let length = 0;

            this.storage.createBlockReadStream(key)
                .on('error', reject)
                .on('data', chunk => {

                    currentChunk = chunk;
                    length+= chunk.length;
                })
                .on('end', () => {

                    const type = length > PartialValue.SIZE ? Value.TYPE_PARTIAL : Value.TYPE_RAW;
                    const data = type === Value.TYPE_RAW ? currentChunk : currentChunk.length;

                    resolve(type, data);
                });
        });
    }

    createPartialValue(key, length) {

        return this.storage.createNewBlock(key)
            .then(block => new BlockPartialValue(key, length, block));
    }

    forEachValueChunk(key, only, forEachCallback) {

        return new Promise((resolve, reject) => {

            this.storage.createBlockReadStream(key)
                .on('error', reject)
                .pipe(new PartialValueWriteStream(only, forEachCallback))
                .on('error', reject)
                .on('finish', resolve);
        });
    }
}

module.exports = BlockKVStore;
