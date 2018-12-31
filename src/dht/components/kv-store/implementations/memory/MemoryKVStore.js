const KVStore = require('../../KVStore');

class MemoryKVStore extends KVStore {

    constructor() {
        super();
        this.memory = {};
    }

    save(key, value) {

        const willStore = !this.memory[key];

        if (willStore) {
            this.memory[key] = value;
        }

        return Promise.resolve(willStore);
    }

    fetch(key) {
        return Promise.resolve(this.memory[key] || null);
    }
}

module.exports = MemoryKVStore;
