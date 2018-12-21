
class InvalidBlockError extends Error {

    constructor(message = 'Block contents do not match its hash.') {

        super(message);
    }
}

module.exports = InvalidBlockError;
