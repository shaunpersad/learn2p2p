const { Readable } = require('stream');

const BlockNotFoundError = require('../../../errors/BlockNotFoundError');

const MemoryBlock = require('./components/MemoryBlock');
const Storage = require('../../Storage');

/**
 * An implementation of Storage that uses memory to save data.
 */
class MemoryStorage extends Storage {

    constructor() {
        super();
        this.memory = {};
    }

    createNewBlock() {

        return Promise.resolve(new MemoryBlock(this.memory));
    }

    createBlockReadStream(hash) {

        const storage = this;
        let iterator = 0;

        return new Readable({
            read(size) {

                if (!storage.memory[hash]) {
                    return this.emit('error', new BlockNotFoundError()); // throw BlockNotFoundError if does not exist.
                }

                const chunk = storage.memory[hash].substring(iterator, iterator + size);
                iterator+= size;
                this.push(chunk || null);
            }
        });
    }

    blockExists(hash) {

        return Promise.resolve(this.memory[hash] !== undefined);
    }
}

module.exports = MemoryStorage;
