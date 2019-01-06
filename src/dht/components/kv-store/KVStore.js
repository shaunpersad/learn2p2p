const PartialValue = require('./components/PartialValue');

class KVStore {

    save(key, value) {

        return Promise.resolve(false);
    }

    fetch(key) {
        return Promise.resolve(null);
    }

    createPartialValue(key, length) {

        return new PartialValue(key);
    }

    static get EXISTS() {
        return 0;
    }

    static get WILL_NOT_STORE() {
        return -1;
    }

    static get STORED() {
        return 1;
    }
}

module.exports = KVStore;