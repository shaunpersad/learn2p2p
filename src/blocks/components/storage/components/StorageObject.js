const { Readable, Writable } = require('stream');

/**
 * ABSTRACT CLASS
 *
 * A storage object is simply a temporary space to write to and read data from (e.g. a temporary file).
 * After using, it can either be saved permanently, or destroyed.
 */
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