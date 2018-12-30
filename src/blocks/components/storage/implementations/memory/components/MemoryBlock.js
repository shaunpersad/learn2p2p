const { Readable, Writable } = require('stream');
const Block = require('../../../../../Block');

class MemoryBlock extends Block {

    constructor(memory) {
        super();

        this.key = Symbol('key');
        this.memory = memory;
        this.memory[this.key] = '';
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
                    this.memory[hash] = this.memory[this.key];
                    delete this.memory[this.key];
                    this.key = hash;

                    resolve(hash);
                });
        });
    }

    destroy() {
        delete this.memory[this.key];
        return Promise.resolve();
    }
}

module.exports = MemoryBlock;