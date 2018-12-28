
class StorageObject {

    constructor() {
        this.length = 0;
    }

    createWriteStream(start = 0) {

        this.length = start;
    }

    createReadStream(start = 0, end = this.length) {

    }

    save(hash) {

        return Promise.resolve(hash);
    }
}

module.exports = StorageObject;