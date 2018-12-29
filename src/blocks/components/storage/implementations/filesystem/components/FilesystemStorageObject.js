const fs = require('fs');
const util = require('util');
const removeFile = util.promisify(fs.unlink);

const WritableStorageObject = require('./WritableStorageObject');
const StorageObject = require('../../../components/StorageObject');

class FilesystemStorageObject extends StorageObject {

    constructor(tempFilePath, createBlockPath) {
        super();
        this.tempFilePath = tempFilePath;
        this.createBlockPath = createBlockPath;
    }

    createWriteStream(start = 0) {

        return new WritableStorageObject(this.tempFilePath, start, this);
    }

    createReadStream(start = 0, end = this.length) {

        if (end) {
            end--;
        }

        return fs.createReadStream(this.tempFilePath, { start, end });
    }

    saveAs(hash) {

        const blockPath = this.createBlockPath(hash);

        return new Promise((resolve, reject) => {

            this.createReadStream()
                .on('error', reject)
                .pipe(fs.createWriteStream(blockPath, { flags: 'wx' }))
                .on('error', reject)
                .on('finish', () => resolve());

        })
            .catch(err => {
                if (err.code !== 'EEXIST') {
                    throw err;
                }
            })
            .then(() => this.destroy())
            .then(() => hash);
    }

    destroy() {
        return removeFile(this.tempFilePath);
    }
}

module.exports = FilesystemStorageObject;