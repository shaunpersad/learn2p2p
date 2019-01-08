
class ValueNotFoundError extends Error {

    constructor(message = 'This value could not be located.') {

        super(message);
    }
}

module.exports = ValueNotFoundError;
