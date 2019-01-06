const MemoryPartialValue = require('./components/MemoryPartialValue');
const KVStore = require('../../KVStore');

class MemoryKVStore extends KVStore {

    constructor() {
        super();
        this.memory = {};
    }

    save(key, value) {

        const willStore = !this.memory[key];

        if (willStore) {
            this.memory[key] = `${value}`;
        }

        return Promise.resolve(willStore);
    }

    fetch(key) {
        return Promise.resolve(this.memory[key] || null);
    }

    createPartialValue(key, length) {

        return new MemoryPartialValue(key, length, this.memory);
    }
}

module.exports = MemoryKVStore;
