
class Value {

    constructor(type, data) {
        this.type = type;
        this.data = data;
    }

    static get TYPE_RAW() {
        return 'raw';
    }

    static get TYPE_PARTIAL() {
        return 'partial';
    }
}

module.exports = Value;