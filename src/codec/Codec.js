const MemoryStore = require('../store/MemoryStore');
const Encoder = require('./Encoder');
const Decoder = require('./Decoder');
const StringStream = require('./StringStream');

/**
 * A simple class to unify encoder and decoder stream creation under the same settings.
 */
class Codec {

    constructor(options = {}) {

        this.options = Object.assign({
            maxLinksPerBlock: 2,
            store: new MemoryStore()
        }, options);
    }

    /**
     * Returns an Encoder stream.
     *
     * @param {{}} [streamOptions]
     * @returns {Encoder}
     */
    encoder(streamOptions) {
        return new Encoder(this.options.store, this.options.maxLinksPerBlock, streamOptions);
    }

    /**
     * Returns a Decoder stream.
     *
     * @param {{}} [streamOptions]
     * @returns {Decoder}
     */
    decoder(streamOptions) {
        return new Decoder(this.options.store, streamOptions);
    }

    /**
     *
     * @param {string} content
     * @param {number} highWaterMark
     * @returns {StringStream}
     */
    static stringStream(content, highWaterMark) {

        return new StringStream(content, { highWaterMark });
    }
}

module.exports = Codec;
