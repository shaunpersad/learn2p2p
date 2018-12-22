const fs = require('fs');
const path = require('path');
const util = require('util');
const crypto = require('crypto');
const open = util.promisify(fs.open);
const read = util.promisify(fs.read);
const write = util.promisify(fs.write);
const close = util.promisify(fs.close);
const removeFile = util.promisify(fs.unlink);
const randomBytes = util.promisify(crypto.randomBytes);

/**
 * Models our hash list as a series of strings in a file.
 *
 * We keep pointers to what entry in the file we're looking at.
 * Each entry also keeps track of how big the previous entry was.
 * Using these two aspects, we can successfully treat this file as a stack
 * with minimal overhead.
 */
class FileBlockStoreHashList {

    constructor(fd, filePath) {
        this.fd = fd;
        this.filePath = filePath;
        this.lastEntryLength = 0;
        this.length = 0;
    }

    /**
     * Pushes a hash entry onto the end of the file.
     *
     * @param {string} hash
     * @returns {Promise<FileBlockStoreHashList>}
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
        return close(this.fd).then(() => removeFile(this.filePath));
    }

    static hashListPath(dataDirectory, id) {
        return path.join(dataDirectory, 'private', 'hash-lists', `${id}.txt`);
    }

    /**
     * Creates a unique temporary file to act as the hash list.
     *
     * @param {string} dataDirectory
     * @returns {Promise<FileBlockStoreHashList>}
     */
    static create(dataDirectory) {

        return randomBytes(48)
            .then(buf => buf.toString('hex'))
            .then(id => {

                const hashListPath = this.hashListPath(dataDirectory, id);

                return open(hashListPath, 'wx+') // write exclusive + read
                    .then(fd => new this(fd, hashListPath))
                    .catch(err => {
                        if (err.code !== 'EEXIST') {
                            throw err;
                        }
                        return this.create(dataDirectory);
                    });
            });

    }
}

module.exports = FileBlockStoreHashList;