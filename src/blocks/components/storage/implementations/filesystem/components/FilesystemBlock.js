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
const WrappedWriteStream = require('../../../../../../utils/WrappedWriteStream');

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

        this.length = start;
        console.log('setting length to', start);

        const initializeSource = () => fs.createWriteStream(this.filePath, { flags: 'r+', start });
        const onWrite = chunk => this.length+= chunk.length;

        return new WrappedWriteStream(initializeSource, onWrite);
    }

    createReadStream(start = 0, end = this.length) {

        if (end) {
            end--;
        }

        return fs.createReadStream(this.filePath, { start, end });
    }

    save() {

        const beforeSave = this.fd ? this.free() : Promise.resolve();

        return beforeSave
            .then(() => truncate(this.filePath, this.length))
            .then(() => this.getMetadata())
            .then(({ hash }) => {

                if (this.intendedHash && hash !== this.intendedHash) {
                    console.log('intended', this.intendedHash);
                    console.log('actual', hash);
                    console.log('length', this.length)
                    throw new InvalidBlockError();
                }
                
                const filePath = this.filePath;
                const blockPath = this.createBlockPath(hash);
                this.filePath = blockPath;

                return rename(filePath, blockPath).then(() => hash);
            });
    }

    destroy() {

        const beforeDestroy = this.fd ? this.free() : Promise.resolve();

        return beforeDestroy.then(() => removeFile(this.filePath));
    }

    reserve(length) {

        return open(this.filePath, 'r+')
            .then(fd => {

                return ftruncate(fd, length).then(() => {
                    this.length = length;
                    console.log('setting length to', length);
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


    free() {

        return close(this.fd)
            .then(() => this.fd = null)
            .then(() => this);
    }
}

module.exports = FilesystemBlock;