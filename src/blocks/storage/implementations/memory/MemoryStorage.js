const { Readable, Writable } = require('stream');

const Storage = require('../../Storage');
const StorageObject = require('../../StorageObject');
const BlockExistsError = require('../../../errors/BlockExistsError');
const BlockNotFoundError = require('../../../errors/BlockNotFoundError');


class MemoryStorage extends Storage {

    constructor() {
        super();
        this.data = {};
    }

    createStorageObject() {

        const storage = this;
        const key = Symbol();
        storage.data[key] = '';

        const MemoryStorageObject = class extends StorageObject {

            createWriteStream(start = 0) {

                this.length = start;

                const storageObject = this;
                let data = '';

                return new Writable({
                    decodeStrings: false,
                    write(chunk, encoding, callback) {

                        data+= chunk;

                        callback();
                    },
                    final(callback) {

                        storage.data[key] = storage.data[key].substring(0, start) + data;
                        storageObject.length = storage.data[key].length;
                        callback();
                    }
                });
            }

            createReadStream(start = 0, end = this.length) {

                let data = storage.data[key].substring(start, end);

                return new Readable({
                    read(size) {

                        const chunk = data.substring(0, size);
                        data = data.substring(size);

                        this.push(chunk || null);
                    }
                });
            }

            save(hash) {

                if (storage.data[hash]) {
                    throw new BlockExistsError();
                }

                storage.data[hash] = storage.data[key];
                delete storage.data[key];

                return Promise.resolve(hash);
            }
        };

        return new MemoryStorageObject();
    }

    createReadStreamAtHash(hash) {

        if (!this.data[hash]) {
            throw new BlockNotFoundError();
        }
        const storage = this;
        let iterator = 0;

        return new Readable({
            read(size) {

                const chunk = storage.data[hash].substring(iterator, iterator + size);
                iterator+= size;
                this.push(chunk || null);
            }
        });
    }

    createWriteStreamAtHash(hash) {

        if (this.data[hash]) {
            throw new BlockExistsError();
        }
        this.data[hash] = '';
        const storage = this;

        new Writable({
            write(chunk, encoding, callback) {
                storage.data[hash]+= chunk.toString();
                callback();
            }
        });
    }
}

module.exports = MemoryStorage;
