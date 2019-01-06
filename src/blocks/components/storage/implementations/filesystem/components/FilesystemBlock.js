const fs = require('fs');
const util = require('util');
const open = util.promisify(fs.open);
const truncate = util.promisify(fs.truncate);
const ftruncate = util.promisify(fs.ftruncate);
const write = util.promisify(fs.write);
const close = util.promisify(fs.close);
const rename = util.promisify(fs.rename);
const removeFile = util.promisify(fs.unlink);

const InvalidBlockError = require('../../../../../components/errors/InvalidBlockError');
const BlockWriteStream = require('./BlockWriteStream');
const Block = require('../../../../../Block');

class FilesystemBlock extends Block {

    constructor(filePath, createBlockPath, intendedHash = null) {
        super();
        this.filePath = filePath;
        this.createBlockPath = createBlockPath;
        this.intendedHash = intendedHash;
        this.length = 0;
        this.fd = null;
    }

    createWriteStream(start = 0) {

        return new BlockWriteStream(this.filePath, start, this);
    }

    createReadStream(start = 0, end = this.length) {

        if (end) {
            end--;
        }

        return fs.createReadStream(this.filePath, { start, end });
    }

    save() {

        const beforeSave = this.fd ? this.unReserve() : Promise.resolve();

        return beforeSave
            .then(() => truncate(this.filePath, this.length))
            .then(() => {

                return new Promise((resolve, reject) => {

                    const extractMetadata = Block.extractMetadata();

                    this.createReadStream()
                        .on('error', reject)
                        .pipe(extractMetadata)
                        .on('error', reject)
                        .on('finish', () => resolve(extractMetadata[Block.HASH]));
                });
            })
            .then(hash => {

                if (this.intendedHash && hash !== this.intendedHash) {
                    return Promise.reject(new InvalidBlockError());
                }
                
                const filePath = this.filePath;
                const blockPath = this.createBlockPath(hash);
                this.filePath = blockPath;

                return rename(filePath, blockPath).then(() => hash);
            });
    }

    destroy() {

        const beforeDestroy = this.fd ? this.unReserve() : Promise.resolve();

        return beforeDestroy.then(() => removeFile(this.filePath));
    }

    reserve(length) {

        return open(this.filePath, 'r+')
            .then(fd => {

                return ftruncate(fd, length).then(() => {
                    this.length = length;
                    this.fd = fd;
                    return this;
                });
            });
    }

    writeToIndex(chunk, index) {

        if (!this.fd) {
            return Promise.reject(new Error('This block was not reserved first.'));
        }

        return write(this.fd, chunk, index);
    }


    unReserve() {

        return close(this.fd)
            .then(() => this.fd = null)
            .then(() => this);
    }
}

module.exports = FilesystemBlock;