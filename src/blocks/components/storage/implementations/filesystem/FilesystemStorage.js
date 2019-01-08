const fs = require('fs');
const path = require('path');
const util = require('util');
const crypto = require('crypto');
const writeFile = util.promisify(fs.writeFile);
const access = util.promisify(fs.access);
const randomBytes = util.promisify(crypto.randomBytes);

const WrappedReadStream = require('../../../../../utils/WrappedReadStream');
const BlockNotFoundError = require('../../../../components/errors/BlockNotFoundError');

const FilesystemBlock = require('./components/FilesystemBlock');

const Storage = require('../../Storage');

/**
 * An implementation of Storage that uses the filesystem.
 * In this implementation, blocks are simply temporary files,
 * and they are saved in their own individual text files when .save() is called.
 */
class FilesystemStorage extends Storage {

    constructor(dataDirectory = path.resolve(__dirname, '../../../../../../data')) {
        super();
        this.dataDirectory = dataDirectory;
        this.createBlockPath = this.createBlockPath.bind(this);
    }

    createNewBlock(intendedHash = null) {

        return this.createTempFilePath(intendedHash)
            .then(tempFilePath => new FilesystemBlock(tempFilePath, this.createBlockPath, intendedHash));
    }

    createBlockReadStream(hash, streamOptions = null) {

        const source = fs.createReadStream(this.createBlockPath(hash));
        const errorTransform = err => {

            if (err.code === 'ENOENT') { // if the file does not exist, throw our own BlockNotFoundError error.
                err = new BlockNotFoundError();
            }
            return err;
        };

        return new WrappedReadStream(source, errorTransform, streamOptions);
    }

    blockExists(hash) {

        return access(this.createBlockPath(hash), (fs.constants || fs).F_OK)
            .then(() => true)
            .catch(err => {

                if (err.code === 'ENOENT') {
                    return false;
                }
                throw err;
            });
    }

    createBlockPath(hash) {
        return path.join(this.dataDirectory, 'public', 'blocks', `${hash}.txt`);
    }

    createTempFilePath(id) {

        return path.join(this.dataDirectory, 'private', 'temp', `${id}.txt`);
    }

    createTempFile(intendedHash = null) {

        if (intendedHash) {
            return this.createExistingFile(intendedHash);
        }

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

    createExistingFile(intendedHash) {

        const tempFilePath = this.createTempFilePath(intendedHash);

        return writeFile(tempFilePath, '', { flag: 'wx', encoding: 'utf8' }) // write exclusive
            .then(() => tempFilePath)
            .catch(err => {
                if (err.code !== 'EEXIST') {
                    throw err;
                }
                return tempFilePath;
            });
    }
}

module.exports = FilesystemStorage;
