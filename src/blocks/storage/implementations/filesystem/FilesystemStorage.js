const fs = require('fs');
const path = require('path');
const util = require('util');
const crypto = require('crypto');
const writeFile = util.promisify(fs.writeFile);
const randomBytes = util.promisify(crypto.randomBytes);

const Storage = require('../../Storage');
const FilesystemStorageObject = require('./components/FilesystemStorageObject');
const ReadableHash = require('./components/ReadableHash');
const WritableHash = require('./components/WritableHash');


class FilesystemStorage extends Storage {

    constructor(dataDirectory = path.resolve(__dirname, '../../../../../data')) {
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
}

module.exports = FilesystemStorage;
