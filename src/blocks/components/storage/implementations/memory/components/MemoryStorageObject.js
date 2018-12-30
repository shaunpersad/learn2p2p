const { Readable, Writable } = require('stream');

const StorageObject = require('../../../components/StorageObject');

/**
 * An implementation of a storage object that uses memory.
 */
class MemoryStorageObject extends StorageObject {

    constructor(data) {
        super();

        this.key = Symbol('key');
        this.data = data;
        this.data[this.key] = '';
    }

    createWriteStream(start = 0) {

        this.length = start;

        const storageObject = this;
        const storageData = storageObject.data;
        const key = storageObject.key;
        let data = '';

        return new Writable({
            decodeStrings: false,
            write(chunk, encoding, callback) {

                data+= chunk;

                callback();
            },
            final(callback) {

                storageData[key] = storageData[key].substring(0, start) + data;
                storageObject.length = storageData[key].length;
                callback();
            }
        });
    }

    createReadStream(start = 0, end = this.length) {

        let data = this.data[this.key].substring(start, end);

        return new Readable({
            read(size) {

                const chunk = data.substring(0, size);
                data = data.substring(size);

                this.push(chunk || null);
            }
        });
    }

    saveAs(hash) {

        this.data[hash] = this.data[this.key];
        delete this.data[this.key];

        return Promise.resolve(hash);
    }

    destroy() {
        delete this.data[this.key];
        return Promise.resolve();
    }
}

module.exports = MemoryStorageObject;
