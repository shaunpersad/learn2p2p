const { Readable, Writable } = require('stream');
const InvalidBlockError = require('../../../../../components/errors/InvalidBlockError');
const Block = require('../../../../../Block');

class MemoryBlock extends Block {

    constructor(memory, intendedHash = null) {
        super();

        this.key = Symbol('key');
        this.intendedHash = intendedHash;
        this.memory = memory;
        this.memory[this.key] = (intendedHash ? this.memory[intendedHash] : '') || '';
    }

    createWriteStream(start = 0) {

        this.length = start;

        const block = this;
        const storageMemory = block.memory;
        const key = block.key;
        let data = '';

        return new Writable({
            decodeStrings: false,
            write(chunk, encoding, callback) {

                data+= chunk;

                callback();
            },
            final(callback) {

                storageMemory[key] = storageMemory[key].substring(0, start) + data;
                block.length = storageMemory[key].length;
                callback();
            }
        });
    }

    createReadStream(start = 0, end = this.length) {

        let data = this.memory[this.key].substring(start, end);

        return new Readable({
            read(size) {

                const chunk = data.substring(0, size);
                data = data.substring(size);

                this.push(chunk || null);
            }
        });
    }

    save() {

        return new Promise((resolve, reject) => {

            const extractMetadata = Block.extractMetadata();

            this.createReadStream()
                .on('error', reject)
                .pipe(extractMetadata)
                .on('error', reject)
                .on('finish', () => {

                    const hash = extractMetadata[Block.HASH];
                    const value = this.memory[this.key];
                    delete this.memory[this.key];

                    if (this.intendedHash && hash !== this.intendedHash) {
                        return reject(new InvalidBlockError());
                    }

                    this.memory[hash] = value;
                    this.key = hash;

                    resolve(hash);
                });
        });
    }

    destroy() {
        delete this.memory[this.key];
        return Promise.resolve();
    }

    reserve(length) {

        while(this.memory[this.key].length < length) {
            this.memory[this.key]+= ' ';
        }
        this.memory[this.key] = this.memory[this.key].substring(0, length);
        this.length = length;
        return Promise.resolve(this);
    }

    writeToIndex(chunk, index) {

        let value = this.memory[this.key];

        if (index >= value.length) {
            return Promise.reject(new Error('This block was not reserved first.'));
        }

        this.memory[this.key] = value.substring(0, index) + chunk + value.substring(index + chunk.length);

        return Promise.resolve();
    }
}

module.exports = MemoryBlock;