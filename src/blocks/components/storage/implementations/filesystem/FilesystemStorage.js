const fs = require('fs');
const path = require('path');
const util = require('util');
const crypto = require('crypto');
const writeFile = util.promisify(fs.writeFile);
const access = util.promisify(fs.access);
const randomBytes = util.promisify(crypto.randomBytes);

const FilesystemStorageObject = require('./components/FilesystemStorageObject');
const ReadableHash = require('./components/ReadableHash');
const WritableHash = require('./components/WritableHash');

const Storage = require('../../Storage');

/**
 * An implementation of Storage that uses the filesystem.
 * In this implementation, storage objects are simply temporary files,
 * and blocks are saved in their own individual text files.
 */
class FilesystemStorage extends Storage {

    constructor(dataDirectory = path.resolve(__dirname, '../../../../../../data')) {
        super();
        this.dataDirectory = dataDirectory;
    }

    createStorageObject() {

        const createBlockPath = this.createBlockPath.bind(this);

        return this.createTempFile().then(tempFilePath => new FilesystemStorageObject(tempFilePath, createBlockPath));
    }

    createReadStreamAtHash(hash) {

        return new ReadableHash(this.createBlockPath(hash));
    }

    createWriteStreamAtHash(hash) {

        return new WritableHash(this.createBlockPath(hash));
    }

    createBlockPath(hash) {
        return path.join(this.dataDirectory, 'public', 'blocks', `${hash}.txt`);
    }

    createTempFilePath(id) {

        return path.join(this.dataDirectory, 'private', 'temp', `${id}.txt`);
    }

    createTempFile() {

        return randomBytes(24)
            .then(buf => buf.toString('hex'))
            .then(id => {

                const tempFilePath = this.createTempFilePath(id);

                return writeFile(tempFilePath, '', { flag: 'wx', encoding: 'utf8' }) // write exclusive
                    .then(() => tempFilePath)
                    .catch(err => {
                        if (err.code !== 'EEXIST') {
                            throw err;
                        }
                        return this.createTempFile();
                    });
            });
    }

    exists(hash) {

        return access(this.createBlockPath(hash), (fs.constants || fs).F_OK)
            .then(() => true)
            .catch(err => {

                if (err.code === 'ENOENT') {
                    return false;
                }
                throw err;
            });
    }
}

module.exports = FilesystemStorage;
