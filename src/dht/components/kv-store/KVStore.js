const Value = require('./components/Value');
const PartialValue = require('./components/PartialValue');

class KVStore {

    getValue(key) {
        return Promise.resolve(new Value());
    }

    createPartialValue(key, length) {

        return Promise.resolve(new PartialValue(key, length));
    }

    forEachValueChunk(key, only, forEachCallback) {

        return Promise.resolve();
    }

    saveRawValueData(key, data) {

        return this
            .createPartialValue(key, data.length)
            .then(partialValue => partialValue.start())
            .then(partialValue => partialValue.add(data))
            .then(partialValue => partialValue.save());
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