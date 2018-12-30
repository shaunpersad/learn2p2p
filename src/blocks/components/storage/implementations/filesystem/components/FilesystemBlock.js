const fs = require('fs');
const util = require('util');
const truncate = util.promisify(fs.truncate);
const rename = util.promisify(fs.rename);
const removeFile = util.promisify(fs.unlink);

const BlockWriteStream = require('./BlockWriteStream');
const Block = require('../../../../../Block');

class FilesystemBlock extends Block {

    constructor(filePath, createBlockPath) {
        super();
        this.filePath = filePath;
        this.createBlockPath = createBlockPath;
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

        return truncate(this.filePath, this.length)
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
                
                const filePath = this.filePath;
                const blockPath = this.createBlockPath(hash);
                this.filePath = blockPath;

                return rename(filePath, blockPath).then(() => hash);
            });
    }

    destroy() {
        return removeFile(this.filePath);
    }
}

module.exports = FilesystemBlock;