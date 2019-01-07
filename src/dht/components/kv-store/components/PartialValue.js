
class PartialValue {

    constructor(key, length) {
        this.key = key;
        this.length = length;
    }

    start() {
        return Promise.resolve(this);
    }

    pause() {
        return Promise.resolve();
    }

    add(chunk, index = 0) {
        return Promise.resolve();
    }

    save() {
        return Promise.resolve();
    }

    destroy() {
        return Promise.resolve();
    }

    static get SIZE() {
        return 1024;
    }
}

module.exports = PartialValue;