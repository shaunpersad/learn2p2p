const { Readable } = require('stream');
const Base64 = require('b64');

const BlockStitcher = require('./components/BlockStitcher');

const BlockNotFoundError = require('../errors/BlockNotFoundError');

const Block = require('../../Block');

/**
 * Provides utility functions to encode data into blocks,
 * to upload blocks to the DHT,
 * to download blocks from the DHT,
 * and to decode blocks into data.
 */
class BlockCodec {

    constructor(storage, dht) {

        this.storage = storage;
        this.dht = dht;
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

        return this.storage.createStorageObject()
            .then(tempFile => {

                return new Promise((resolve, reject) => {

                    readStream.on('error', reject)
                        .pipe(new Base64.Encoder()) // encode the data into base64
                        .on('error', reject)
                        .pipe(tempFile.createWriteStream()) // write the base64 data into the storage object
                        .on('error', reject)
                        .on('finish', () => resolve(tempFile));

                });

            }).then(tempFile => this.createBlocks(tempFile)); // create blocks out of the storage object
    }

    /**
     * Chops up the contents of a storage object into blocks.
     *
     * This algorithm starts at the end of the storage object and works its way to the start,
     * extracting as many block-sized chunks as it can until MAX_NUM_LINKS.
     * It hashes these chunks and saves them as individual blocks,
     * then appends their hashes back into the end of the storage object.
     * The process then repeats itself until there is only one block left. That is the root block.
     * The root block's hash is then returned.
     *
     * @param {StorageObject} tempFile
     * @returns {Promise<string>}
     */
    createBlocks(tempFile) {

        return Promise.resolve().then(() => {

            let numLinks = 0;
            let length = tempFile.length;

            /**
             * Calculate the maximum number of links we can create.
             */
            while (numLinks < Block.MAX_NUM_LINKS && (length - Block.SIZE) > 0) {

                length-= Block.SIZE;
                numLinks++;
            }

            /**
             * If there are no more links to create, we're at the root block.
             * Calculate it's hash, and save it using it's hash.
             */
            if (!numLinks) {

                const extractMetadata = Block.extractMetadata();

                return new Promise((resolve, reject) => {

                    tempFile.createReadStream()
                        .on('error', reject)
                        .pipe(extractMetadata)
                        .on('error', reject)
                        .on('data', data => {})
                        .on('end', () => tempFile.saveAs(extractMetadata[Block.HASH]).then(resolve)); // returns the hash
                });
            }

            /**
             * If we do have links to create, lets create their blocks.
             * We do so by reading the specific chunks out of the storage object,
             * calculating their hash, and saving them in a new storage object using their hash.
             */
            return Promise.all(Array.from({ length: numLinks }, (value, i) => {

                return this.storage.createStorageObject() // create a new storage object that acts as the block
                    .then(block => {

                        return new Promise((resolve, reject) => {

                            const extractMetadata = Block.extractMetadata();
                            const start = length + (i * Block.SIZE);
                            const end = start + Block.SIZE;

                            tempFile.createReadStream(start, end) // figure out where to read from
                                .on('error', reject)
                                .pipe(extractMetadata)
                                .on('error', reject)
                                .pipe(block.createWriteStream()) // write the data into the block
                                .on('error', reject)
                                .on('finish', () => block.saveAs(extractMetadata[Block.HASH]).then(resolve));
                        });
                    });

            })).then(hashes => {

                /**
                 * Once we have the hashes of the newly created links,
                 * append them to the end of the storage object.
                 */
                return new Promise((resolve, reject) => {

                    const links = `\n${hashes.join('\n')}`;

                    if (links.length > Block.SIZE) {
                        return reject(new Error('Links are bigger than the block size.'));
                    }

                    this.constructor.createStringStream(links)
                        .on('error', reject)
                        .pipe(tempFile.createWriteStream(length)) // start writing at the end of the storage object
                        .on('error', reject)
                        .on('finish', () => resolve());

                });
            });

        }).then(hash => {

            if (!hash) { // if we haven't yet gotten the root block's hash, recursively call createBlocks.
                return this.createBlocks(tempFile);
            }

            return hash;
        });
    }

    /**
     * Starts at the root block,
     * uploads the block's location into the DHT,
     * then recursively calls itself on the block's links.
     * Once there are no more links to operate on, we're done.
     *
     * At the end, all block locations should be uploaded to the DHT.
     *
     * @param {string} hash
     * @returns {Promise<string>}
     */
    upload(hash) {

        return this.dht.kvStore.fetch(hash) // get the block's location out of the DHT's local KV store
            .then(value => this.dht.save(hash, value)) // save the block's location into the DHT
            .then(() => {

                return new Promise((resolve, reject) => {

                    const extractMetadata = Block.extractMetadata();

                    this.storage.createReadStreamAtHash(hash) // read from the block to get its links
                        .on('error', reject)
                        .pipe(extractMetadata)
                        .on('error', reject)
                        .on('data', () => {})
                        .on('end', () => resolve(extractMetadata[Block.LINKS])); // get the block's links
                });
            })
            .then(links => {

                if (!links.length) {
                    return hash;
                }

                return Promise.all(links.map(hash => this.upload(hash)));
            });
    }

    /**
     * Starts at the root block,
     * checks if it exists in storage,
     * if it does, recursively call itself on it's links.
     * If it does not, download it from the DHT, then
     * retry the download.
     *
     * At the end, all blocks should be in storage.
     *
     * @param {string} hash
     * @returns {Promise}
     */
    download(hash) {

        return new Promise((resolve, reject) => {

            const extractMetadata = Block.extractMetadata();

            this.storage.createReadStreamAtHash(hash)
                .on('error', reject)
                .pipe(extractMetadata)
                .on('error', reject)
                .on('data', () => {})
                .on('end', () => resolve(extractMetadata[Block.LINKS]));
        })
            .then(links => {

                if (!links.length) {
                    return hash;
                }

                return Promise.all(links.map(hash => this.download(hash)));
            })
            .catch(err => {

                if (!(err instanceof BlockNotFoundError)) {
                    throw err;
                }

                return this.dht.fetch(hash)
                    .then(value => this.dht.kvStore.save(hash, value))
                    .then(() => this.download(hash));
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

            (new BlockStitcher(hash, this.storage)) // recursively processes each block and its links in the right order
                .on('error', reject)
                .pipe(new Base64.Decoder()) // decodes the data from its base64 format back to its original format
                .on('error', reject)
                .pipe(writeStream)
                .on('error', reject)
                .on('finish', () => resolve());
        });
    }

    /**
     *
     * @param {string} content
     * @returns {Readable}
     */
    static createStringStream(content) {

        return new Readable({
            read(size) {
                this.push(content.substring(0, size));

                if (!(content = content.substring(size))) {
                    this.push(null);
                }
            }
        });
    }
}

module.exports = BlockCodec;
