const StorageObject = require('./StorageObject');

class Storage {

    createStorageObject() {

        return new StorageObject();
    }

    createReadStreamAtHash(hash) {

    }

    createWriteStreamAtHash(hash) {

    }
}

module.exports = Storage;
