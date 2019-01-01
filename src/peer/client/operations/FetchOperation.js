const fs = require('fs');
const Operation = require('../Operation');

class FetchOperation extends Operation {

    constructor(hash, destination) {
        super();
        this.hash = hash;
        this.destination = destination;
    }

    optionsHandler(options) {

        return Object.assign({ path: `/${this.hash}` }, options);
    }

    requestHandler(req) {

        req.end();
    }

    responseHandler(res) {

        const writeFile = fs.createWritableStream(this.destination).on('error', this.errorHandler);

        res.pipe(writeFile).on('finish', () => console.log('File downloaded.'));
    }
}

module.exports = FetchOperation;