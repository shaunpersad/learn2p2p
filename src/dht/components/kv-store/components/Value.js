const PartialValue = require('./PartialValue');

class Value {

    constructor(type, data) {
        this.type = type;
        this.data = data;
    }

    /**
     *
     * @param {Readable} readStream
     * @returns {Promise<Value>}
     */
    static createFromReadStream(readStream) {

        const Value = this;
        return new Promise((resolve, reject) => {

            let currentChunk = null;
            let length = 0;

            readStream
                .on('error', reject)
                .on('data', chunk => {

                    currentChunk = chunk;
                    length+= chunk.length;
                })
                .on('end', () => {

                    const type = length > PartialValue.SIZE ? Value.TYPE_PARTIAL : Value.TYPE_RAW;
                    const data = type === Value.TYPE_RAW ? currentChunk : currentChunk.length;

                    resolve(new Value(type, data));
                });
        });
    }

    static get TYPE_RAW() {
        return 'raw';
    }

    static get TYPE_PARTIAL() {
        return 'partial';
    }
}

module.exports = Value;