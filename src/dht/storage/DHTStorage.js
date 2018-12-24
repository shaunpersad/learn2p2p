
class DHTStorage {

    constructor(maxDataLength) {
        this.maxDataLength = maxDataLength;
    }

    save(key, value) {

    }

    fetch(key) {

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
