const { Readable, Writable } = require('stream');

class StorageObject {

    constructor() {
        this.length = 0;
    }

    createWriteStream(start = 0) {

        this.length = start;
        return new Writable();
    }

    createReadStream(start = 0, end = this.length) {

        return new Readable();
    }

    saveAs(hash) {

        return Promise.resolve(hash);
    }

    destroy() {
        return Promise.resolve();
    }
}

module.exports = StorageObject;