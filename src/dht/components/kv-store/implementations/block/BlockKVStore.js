const WrappedReadStream = require('../../../../../utils/WrappedReadStream');
const WrappedWriteStream = require('../../../../../utils/WrappedWriteStream');
const BlockNotFoundError = require('../../../../../blocks/components/errors/BlockNotFoundError');
const ValueNotFoundError = require('../../../../components/errors/ValueNotFoundError');
const BlockPartialValue = require('./components/BlockPartialValue');
const KVStore = require('../../KVStore');

class BlockKVStore extends KVStore {

    constructor(storage) {
        super();
        this.storage = storage;
    }

    createDataReadStream(key, streamOptions = null) {

        const source = this.storage.createBlockReadStream(key);
        const errorTransform = err => {

            if (err instanceof BlockNotFoundError) {
                err = new ValueNotFoundError();
            }
            return err;
        };

        return new WrappedReadStream(source, errorTransform, streamOptions);
    }

    createDataWriteStream(key) {

        let block = null;
        const initializeSource = () => {

            return this.storage.createNewBlock(key)
                .then(_block => {
                    block = _block;
                    return _block.createWriteStream();
                });
        };
        const onWrite = () => Promise.resolve();
        const onEnd = () => block.save();

        return new WrappedWriteStream(initializeSource, onWrite, onEnd);
    }

    createPartialValue(key, length) {

        return this.storage.createNewBlock(key)
            .then(block => new BlockPartialValue(key, length, block));
    }
}

module.exports = BlockKVStore;
