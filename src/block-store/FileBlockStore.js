const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const util = require('util');
const open = util.promisify(fs.open);
const read = util.promisify(fs.read);
const write = util.promisify(fs.write);
const close = util.promisify(fs.close);
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const removeFile = util.promisify(fs.unlink);
const randomBytes = util.promisify(crypto.randomBytes);

const BlockStore = require('./BlockStore');
const Block = require('../codec/Block');

/**
 * Models our hash list as a series of strings in a file.
 *
 * We keep pointers to what entry in the file we're looking at.
 * Each entry also keeps track of how big the previous entry was.
 * Using these two aspects, we can successfully treat this file as a stack
 * with minimal overhead.
 */
class HashList {
    constructor(fd, hashListPath) {
        this.fd = fd;
        this.hashListPath = hashListPath;
        this.lastEntryLength = 0;
        this.length = 0;
    }

    /**
     * Pushes a hash entry onto the end of the file.
     *
     * @param {string} hash
     * @returns {Promise<HashList>}
     */
    push(hash) {

        const entry = JSON.stringify([ this.lastEntryLength, hash ]);
        this.lastEntryLength = entry.length;
        this.length+= this.lastEntryLength;

        const buffer = Buffer.from(entry);

        return write(this.fd, buffer, 0, this.lastEntryLength, this.length - this.lastEntryLength)
            .then(() => this);
    }

    /**
     * Pops out a hash entry from the end of the file.
     *
     * @returns {Promise<string>}
     */
    pop() {

        if (!this.length) {
            return Promise.resolve('');
        }

        const buffer = Buffer.alloc(this.lastEntryLength, '');

        return read(this.fd, buffer, 0, this.lastEntryLength, this.length - this.lastEntryLength)
            .then(() => {

                const [ lastEntryLength, hash ] = JSON.parse(buffer.toString('utf8'));
                this.length-= this.lastEntryLength;
                this.lastEntryLength = lastEntryLength;

                return hash;
            });
    }

    /**
     * Closes the fd and removes the file.
     * @returns {Promise}
     */
    destroy() {
        return close(this.fd).then(() => removeFile(this.hashListPath));
    }
}

/**
 * An implementation of BlockStore that uses files.
 */
class FileBlockStore extends BlockStore {

    constructor(dataDirectory = path.resolve(__dirname, '../../data')) {
        super();
        this.dataDirectory = dataDirectory;
    }

    /**
     * Unique to FileBlockStore
     * to help find a specific block.
     *
     * @param {string} hash
     * @returns {string}
     */
    blockPath(hash) {
        return path.join(this.dataDirectory, 'blocks', `${hash}.json`);
    }

    /**
     * Unique to FileBlockStore
     * to help find a specific hash list.
     *
     * @param {string} hashListId
     * @returns {string}
     */
    hashListPath(hashListId) {
        return path.join(this.dataDirectory, 'hash-lists', `${hashListId}.txt`);
    }

    /**
     * Unique to the FileBlockStore,
     * this method creates a temporary, unique file
     * to store the list of hashes.
     *
     * @param hashListId
     * @returns {Promise<HashList|null>}
     */
    getHashList(hashListId = null) {

        if (hashListId) {
            return Promise.resolve(hashListId);
        }

        return randomBytes(48)
            .then(buf => buf.toString('hex'))
            .then(id => {

                const hashListPath = this.hashListPath(id);

                return open(hashListPath, 'wx+')
                    .then(fd => new HashList(fd, hashListPath))
                    .catch(err => {
                        if (err.code !== 'EEXIST') {
                            throw err;
                        }
                        return this.getHashList();
                    });
            });
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
                    throw new this.constructor.InvalidBlockError();
                }
                return block;
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
        return writeFile(this.blockPath(hash), contents, { flag: 'wx' })
            .catch(err => {
                if (err.code !== 'EEXIST') {
                    throw err;
                }
            })
            .then(() => hash);
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

module.exports = FileBlockStore;
