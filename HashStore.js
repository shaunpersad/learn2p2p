class HashStore {

    constructor() {
        this.hashes = {};
    }

    get(hash) {
        return Promise.resolve(this.hashes[hash]);
    }

    set(hash, value) {
        this.hashes[hash] = value;
        return Promise.resolve(hash);
    }

    all() {
        return Promise.resolve(this.hashes);
    }
}

module.exports = HashStore;
