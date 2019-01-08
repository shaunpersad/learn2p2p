const PartialValue = require('../../../components/PartialValue');

class BlockPartialValue extends PartialValue {

    constructor(key, length, block) {
        super(key, length);
        this.block = block;
    }

    start() {
        return this.block.reserve(this.length).then(() => this);
    }

    pause() {
        this.block.free();
    }

    add(chunk, index = 0) {
        return this.block.writeToIndex(chunk, index);
    }

    save() {
        return this.block.save();
    }

    destroy() {
        return this.block.destroy();
    }
}

module.exports = BlockPartialValue;
