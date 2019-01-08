const { Readable } = require('stream');
const Block = require('../../Block');
const MetadataExtractor = require('../codec/components/MetadataExtractor');

/**
 * ABSTRACT CLASS
 *
 * This represents the entity that stores and retrieves block data.
 * You should be able to create new blocks, stream block data,
 * and check if a block exists.
 */
class Storage {


    /**
     * @param {string|null} [intendedHash]
     * @returns {Promise<Block>}
     */
    createNewBlock(intendedHash = null) {

        return Promise.resolve(new Block());
    }

    /**
     * @param {string} hash
     * @param {{}|null} [streamOptions]
     * @returns {Readable}
     */
    createBlockReadStream(hash, streamOptions = null) {

        return new Readable(streamOptions);
    }

    getBlockMetadata(hash) {

        return new Promise((resolve, reject) => {

            const metadataExtractor = new MetadataExtractor();

            this.createBlockReadStream(hash)
                .on('error', reject)
                .pipe(metadataExtractor)
                .on('error', reject)
                .on('finish', () => resolve(metadataExtractor[MetadataExtractor.METADATA]));
        });
    }
}

module.exports = Storage;
