
class BlockNotFoundError extends Error {

    constructor(message = 'This block could not be located.') {

        super(message);
    }
}

module.exports = BlockNotFoundError;
