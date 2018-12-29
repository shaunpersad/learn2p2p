const { Readable } = require('stream');
const Base64 = require('b64');

const BlockStitcher = require('./components/BlockStitcher');

const BlockNotFoundError = require('../errors/BlockNotFoundError');

const Block = require('../../Block');


class BlockCodec {

    constructor(storage, dht) {

        this.storage = storage;
        this.dht = dht;
    }

    createBlocks(tempFile) {

        return Promise.resolve().then(() => {

            let numLinks = 0;
            let length = tempFile.length;

            while (numLinks < Block.MAX_NUM_LINKS && (length - Block.SIZE) > 0) {

                length-= Block.SIZE;
                numLinks++;
            }

            if (!numLinks) {

                const extractMetadata = Block.extractMetadata();

                return new Promise((resolve, reject) => {

                    tempFile.createReadStream()
                        .on('error', reject)
                        .pipe(extractMetadata)
                        .on('error', reject)
                        .on('data', data => {})
                        .on('end', () => tempFile.saveAs(extractMetadata[Block.HASH]).then(resolve));
                });
            }

            return Promise.all(Array.from({ length: numLinks }, (value, i) => {

                return this.storage.createStorageObject()
                    .then(block => {

                        return new Promise((resolve, reject) => {

                            const extractMetadata = Block.extractMetadata();
                            const start = length + (i * Block.SIZE);
                            const end = start + Block.SIZE;

                            tempFile.createReadStream(start, end)
                                .on('error', reject)
                                .pipe(extractMetadata)
                                .on('error', reject)
                                .pipe(block.createWriteStream())
                                .on('error', reject)
                                .on('finish', () => block.saveAs(extractMetadata[Block.HASH]).then(resolve));
                        });
                    });

            })).then(hashes => {

                return new Promise((resolve, reject) => {

                    const links = `\n${hashes.join('\n')}`;

                    if (links.length > Block.SIZE) {
                        return reject(new Error('Links are bigger than the block size.'));
                    }

                    this.constructor.createStringStream(links)
                        .on('error', reject)
                        .pipe(tempFile.createWriteStream(length))
                        .on('error', reject)
                        .on('finish', () => resolve());

                });
            });

        }).then(hash => {

            if (!hash) {
                return this.createBlocks(tempFile);
            }

            return hash;
        });

    }

    encode(readStream) {

        return this.storage.createStorageObject()
            .then(tempFile => {

                return new Promise((resolve, reject) => {

                    readStream.on('error', reject)
                        .pipe(new Base64.Encoder())
                        .on('error', reject)
                        .pipe(tempFile.createWriteStream())
                        .on('error', reject)
                        .on('finish', () => resolve(tempFile));

                });

            }).then(tempFile => this.createBlocks(tempFile))
    }

    decode(hash, writeStream) {

        return new Promise((resolve, reject) => {

            (new BlockStitcher(hash, this.storage))
                .on('error', reject)
                .pipe(new Base64.Decoder())
                .on('error', reject)
                .pipe(writeStream)
                .on('error', reject)
                .on('finish', () => resolve());
        });
    }

    upload(hash) {

        return this.dht.kvStore.fetch(hash)
            .then(value => this.dht.save(hash, value))
            .then(() => {

                return new Promise((resolve, reject) => {

                    const extractMetadata = Block.extractMetadata();

                    this.storage.createReadStreamAtHash(hash)
                        .on('error', reject)
                        .pipe(extractMetadata)
                        .on('error', reject)
                        .on('data', () => {})
                        .on('end', () => resolve(extractMetadata[Block.LINKS]));
                });
            })
            .then(links => {

                if (!links.length) {
                    return hash;
                }

                return Promise.all(links.map(hash => this.upload(hash)));
            });
    }

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
