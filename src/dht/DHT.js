const Value = require('./components/kv-store/components/Value');
class DHT {

    constructor(kvStore) {
        this.kvStore = kvStore;
    }

    bootstrap() {
        return Promise.resolve(this);
    }

    /**
     * @param {string} key
     * @returns {Promise<{fail: number, success: number}>}
     */
    upload(key) {
        return Promise.resolve({ success: 0, fail: 0 });
    }

    download(key) {
        return this.kvStore.getValue(key);
    }
}

module.exports = DHT;
