const fs = require('fs');
const path = require('path');
const util = require('util');
const { Transform } = require('stream');
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const removeFile = util.promisify(fs.unlink);
const exists = util.promisify(fs.access);

const Store = require('./_Store');
const FileStoreHashList = require('./FileStoreHashList');
const InvalidBlockError = require('./InvalidBlockError');
const Block = require('../Block');

/**
 * An implementation of Store that uses files.
 */
class FileStore extends Store {

    constructor(dataDirectory = path.resolve(__dirname, '../../data')) {
        super();
        this.dataDirectory = dataDirectory;
    }

    /**
     * Unique to FileStore
     * to help find a specific block.
     *
     * @param {string} hash
     * @returns {string}
     */
    blockPath(hash) {
        return path.join(this.dataDirectory, 'public', 'blocks', `${hash}.json`);
    }

    /**
     * Unique to the FileStore,
     * this method creates a temporary, unique file
     * to store the list of hashes.
     *
     * @param hashListId
     * @returns {Promise<FileStoreHashList|null>}
     */
    getHashList(hashListId = null) {

        if (hashListId) {
            return Promise.resolve(hashListId);
        }

        return FileStoreHashList.create(this.dataDirectory);
    }

    /**
     * Gets the block associated with this hash.
     *
     * Reads from a file, and checks the block's content
     * to make sure it's valid with the hash.
     *
     * @param {string} hash
     * @returns {Promise<Block>}
     */
    fetch(hash) {

        return readFile(this.blockPath(hash), {encoding: 'utf-8'})
            .then(contents => {

                const block = Block.fromString(contents);
                if (block.hash() !== hash) {
                    throw new InvalidBlockError();
                }
                return block;
            })
            .catch(err => {

                if (err.code !== 'ENOENT') {
                    throw err;
                }
                return null;
            });
    }

    /**
     * Saves a block by its hash.
     *
     * If the file already exists, we ignore it.
     *
     * @param {Block} block
     * @returns {Promise<string>}
     */
    save(block) {

        const hash = block.hash();
        const contents = block.toString();
        return writeFile(this.blockPath(hash), contents, { flag: 'wx' }) // write exclusive
            .catch(err => {
                if (err.code !== 'EEXIST') {
                    throw err;
                }
            })
            .then(() => hash);
    }

    saveStream(hash, maxDataLength) {

        let length = 0;
        const hashStream = Block.createHash();

        const transform = new Transform({
            transform(chunk, encoding, callback) {

                length+= chunk.length;
                if (length > maxDataLength) {
                    return callback(new Error('Too much data.'));
                }
                hashStream.update(chunk);
                callback(null, chunk);
            },
            flush(callback) {

                if (hashStream.digest('hex') !== hash) {
                    return callback(new InvalidBlockError());
                }
                callback();
            }
        });

        const write = fs.createWriteStream(this.blockPath(hash), { flags: 'wx' }).once('error', function(err) {

            if (err.code !== 'EEXIST') {
                this.emit('error', err);
            }
        });

        return transform.pipe(write);
    }

    exists(hash) {

        return exists(this.blockPath(hash)).then(() => true).catch(() => false);
    }

    /**
     * Updates a block and removes its old entry.
     *
     * @param {Block} block
     * @param {string} oldHash
     * @returns {Promise<string>}
     */
    update(block, oldHash) {

        return removeFile(this.blockPath(oldHash)).then(() => this.save(block));
    }

    /**
     * Maintains a list of hashes for blocks.
     * If no hash list id is supplied,
     * a new one is created.
     *
     * Returns a HashList instance that acts as the id of the list.
     *
     * @param {string} hash
     * @param {*|null} [hashListId]
     * @returns {Promise<*>}
     */
    pushToHashList(hash, hashListId = null) {

        return this.getHashList(hashListId).then(hashList => hashList.push(hash));
    }

    /**
     * Removes items from the hash list and returns it.
     *
     * @param {*} hashListId
     * @param {number} [amount]
     * @returns {Promise<[string]>}
     */
    pullFromHashList(hashListId, amount = 1) {

        const hashes = [];

        return this.getHashList(hashListId)
            .then(hashList => {

                const pull = () => {

                    if (amount-- <= 0) {
                        return Promise.resolve(hashes);
                    }

                    return hashList.pop()
                        .then(hash => {

                            if (hash) {
                                hashes.unshift(hash);
                            }
                            return pull();
                        });
                };

                return pull();
            });
    }

    /**
     * Removes/cleans up the hash list.
     *
     * This closes the fd and deletes the file.
     *
     * @param {*} hashListId
     * @returns {Promise}
     */
    removeHashList(hashListId) {

        return this.getHashList(hashListId).then(hashList => hashList.destroy());
    }

}

module.exports = FileStore;
