
class BlockExistsError extends Error {

    constructor(message = 'This block already exists.') {

        super(message);
    }
}

module.exports = BlockExistsError;

