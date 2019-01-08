const Base64 = require('b64');
const StringStream = require('../../../utils/StringStream');
const DataStitcher = require('./components/DataStitcher');
const Block = require('../../Block');

/**
 * Provides utility functions to encode data into blocks and to decode blocks into data.
 */
class Codec {

    constructor(storage) {

        this.storage = storage;
    }

    /**
     * Encodes data from some source stream into blocks.
     *
     * Returns the hash of the root block.
     *
     * @param readStream
     * @returns {Promise<string>}
     */
    encode(readStream) {

        return this.storage.createNewBlock()
            .then(rootBlock => {

                return new Promise((resolve, reject) => {

                    readStream.on('error', reject)
                        .pipe(new Base64.Encoder()) // encode the data into base64
                        .on('error', reject)
                        .pipe(rootBlock.createWriteStream()) // write the base64 data into the root block
                        .on('error', reject)
                        .on('finish', () => resolve(rootBlock));

                });

            }).then(rootBlock => this.createBlocks(rootBlock)); // create blocks out of the root block
    }

    /**
     * Chops up the contents of the root block into linked blocks.
     *
     * This algorithm starts at the end of the root block and works its way to the start,
     * extracting as many block-sized chunks as it can until MAX_NUM_LINKS.
     * It hashes these chunks and saves them as individual blocks,
     * then appends their hashes back into the end of the root block.
     * The process then repeats itself until no more links can be created.
     * The root block's hash is then returned.
     *
     * @param {Block} rootBlock
     * @returns {Promise<string>}
     */
    createBlocks(rootBlock) {

        return Promise.resolve().then(() => {

            let numLinks = 0;
            let length = rootBlock.length;

            /**
             * Calculate the maximum number of links we can create.
             */
            while (numLinks < Block.MAX_NUM_LINKS && (length - Block.SIZE) > 0) {

                length-= Block.SIZE;
                numLinks++;
            }

            /**
             * If there are no more links to create, save the root block.
             */
            if (!numLinks) {
                return rootBlock.save();
            }

            /**
             * If we do have links to create, lets create their blocks.
             * We do so by reading the specific chunks out of the root block,
             * and saving them in their own blocks.
             */
            return Promise.all(Array.from({ length: numLinks }, (value, i) => {

                return this.storage.createNewBlock()
                    .then(block => {

                        return new Promise((resolve, reject) => {

                            const start = length + (i * Block.SIZE);
                            const end = start + Block.SIZE;

                            rootBlock.createReadStream(start, end) // figure out where to read from
                                .on('error', reject)
                                .pipe(block.createWriteStream()) // write the data into the new block
                                .on('error', reject)
                                .on('finish', () => resolve(block));
                        });
                    })
                    .then(block => block.save());

            })).then(hashes => {

                /**
                 * Once we have the hashes of the newly created blocks,
                 * append them to the end of the root block.
                 */
                return new Promise((resolve, reject) => {

                    const links = `\n${hashes.join('\n')}`;

                    if (links.length > Block.SIZE) {
                        return reject(new Error('Links are bigger than the block size.'));
                    }

                    (new StringStream(links))
                        .on('error', reject)
                        .pipe(rootBlock.createWriteStream(length)) // start writing at the end of the root block
                        .on('error', reject)
                        .on('finish', () => resolve());

                });
            });

        }).then(hash => {

            if (!hash) { // if we haven't yet gotten the root block's hash, recursively call createBlocks.
                return this.createBlocks(rootBlock);
            }

            return hash;
        });
    }

    /**
     * Starts at the root block, streams out its data,
     * then performs the same on it's linked blocks.
     * This happens recursively until there are no more blocks left.
     *
     * All data is decoded from its base64 format.
     *
     * @param {string} hash
     * @param writeStream
     * @returns {Promise}
     */
    decode(hash, writeStream) {

        return new Promise((resolve, reject) => {

            (new DataStitcher(hash, this.storage)) // recursively processes each block and its links in the right order
                .on('error', reject)
                .pipe(new Base64.Decoder()) // decodes the data from its base64 format back to its original format
                .on('error', reject)
                .pipe(writeStream)
                .on('error', reject)
                .on('finish', () => resolve());
        });
    }

    getBlockLinks(hash) {

        return this.storage.getBlockMetadata(hash).then(({ links }) => links);
    }
}

module.exports = Codec;
