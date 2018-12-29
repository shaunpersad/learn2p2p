const { Readable, Writable } = require('stream');

const Storage = require('../../Storage');
const MemoryStorageObject = require('./components/MemoryStorageObject');
const BlockExistsError = require('../../../errors/BlockExistsError');
const BlockNotFoundError = require('../../../errors/BlockNotFoundError');


class MemoryStorage extends Storage {

    constructor() {
        super();
        this.data = {};
    }

    createStorageObject() {

        return Promise.resolve(new MemoryStorageObject(this.data));
    }

    createReadStreamAtHash(hash) {

        const storage = this;
        let iterator = 0;

        return new Readable({
            read(size) {

                if (!storage.data[hash]) {
                    return this.emit('error', new BlockNotFoundError());
                }

                const chunk = storage.data[hash].substring(iterator, iterator + size);
                iterator+= size;
                this.push(chunk || null);
            }
        });
    }

    createWriteStreamAtHash(hash) {

        const storage = this;
        const exists = !!storage.data[hash];
        if (!exists) {
            this.data[hash] = '';
        }

        new Writable({
            write(chunk, encoding, callback) {

                if (exists) {
                    return callback(new BlockExistsError());
                }

                storage.data[hash]+= chunk.toString();

                callback();
            }
        });
    }
}

module.exports = MemoryStorage;
