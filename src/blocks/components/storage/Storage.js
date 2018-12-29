const { Readable, Writable } = require('stream');
const StorageObject = require('./components/StorageObject');

class Storage {

    createStorageObject() {

        return Promise.resolve(new StorageObject());
    }

    createReadStreamAtHash(hash) {

        return new Readable();
    }

    createWriteStreamAtHash(hash) {

        return new Writable();
    }

    exists(hash) {

        return Promise.resolve(false);
    }
}

module.exports = Storage;
