const { Readable } = require('stream');
const MemoryBlockStore = require('../block-store/MemoryBlockStore');
const Encoder = require('./Encoder');
const Decoder = require('./Decoder');
const StringStream = require('./StringStream');

/**
 * A simple class to unify encoder and decoder stream creation under the same settings.
 */
class Codec {

    constructor(options = {}) {

        this.options = Object.assign({
            maxNumLinks: 2,
            blockStore: new MemoryBlockStore()
        }, options);
    }

    encoder() {
        return new Encoder(this.options.blockStore, this.options.maxNumLinks);
    }

    decoder() {
        return new Decoder(this.options.blockStore);
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
