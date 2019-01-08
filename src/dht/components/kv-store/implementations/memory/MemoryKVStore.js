const { Readable, Writable } = require('stream');
const ValueNotFoundError = require('../../../../components/errors/ValueNotFoundError');
const MemoryPartialValue = require('./components/MemoryPartialValue');
const KVStore = require('../../KVStore');

class MemoryKVStore extends KVStore {

    constructor() {
        super();
        this.memory = {};
    }

    createDataReadStream(key, streamOptions = null) {

        const kvStore = this;
        let iterator = 0;

        return new Readable(Object.assign(streamOptions || {}, {
            read(size) {

                if (!kvStore.memory[key]) {
                    return this.emit('error', new ValueNotFoundError()); // throw BlockNotFoundError if does not exist.
                }

                const chunk = kvStore.memory[key].substring(iterator, iterator + size);
                iterator+= size;
                this.push(chunk || null);
            }
        }));
    }

    createDataWriteStream(key) {

        const memory = this.memory;
        let data = '';

        return new Writable({
            decodeStrings: false,
            write(chunk, encoding, callback) {

                data+= chunk;

                callback();
            },
            final(callback) {

                memory[key] = data;
                callback();
            }
        });
    }

    createPartialValue(key, length) {

        return Promise.resolve(new MemoryPartialValue(key, length, this.memory));
    }
}

module.exports = MemoryKVStore;
