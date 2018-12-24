const MemoryStore = require('../storage/implementations/memory/MemoryBlockStorage');
const Encoder = require('./components/DataEncoder');
const Decoder = require('./components/HashDecoder');
const StringStream = require('./components/StringStream');

/**
 * A simple class to unify encoder and decoder stream creation under the same settings.
 */
class BlockCodec {

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

module.exports = BlockCodec;
