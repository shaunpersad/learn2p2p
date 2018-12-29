const StorageObject = require('./components/StorageObject');

class Storage {

    createStorageObject() {

        return Promise.resolve(new StorageObject());
    }

    createReadStreamAtHash(hash) {

    }

    createWriteStreamAtHash(hash) {

    }
}

module.exports = Storage;
