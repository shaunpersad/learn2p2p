const PartialValue = require('../../../components/PartialValue');

class MemoryPartialValue extends PartialValue {

    constructor(key, length, memory) {
        super(key, length);
        this.memory = memory;
        this.value = '';
    }

    start() {
        this.value = '' + (this.memory[this.key] || '');
        while(this.value.length < this.length) {
            this.value+= ' ';
        }
        return Promise.resolve(this);
    }

    add(chunk, index) {
        this.value = this.value.substring(0, index) + chunk + this.value.substring(index + chunk.length);
        return Promise.resolve();
    }

    save() {
        this.memory[this.key] = this.value;
        return Promise.resolve();
    }

    destroy() {
        this.value = '';
        return Promise.resolve();
    }
}

module.exports = MemoryPartialValue;

