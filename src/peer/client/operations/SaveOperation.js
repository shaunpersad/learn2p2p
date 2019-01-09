const fs = require('fs');
const Operation = require('../Operation');

class SaveOperation extends Operation {

    constructor(source) {
        super();
        this.source = source;
        console.log(this.source);
    }

    optionsHandler(options) {

        return Object.assign({ method: 'POST' }, options);
    }

    requestHandler(req) {

        const readFile = fs.createReadStream(this.source).on('error', this.errorHandler);

        readFile.pipe(req);
    }

    responseHandler(res) {

        let body = '';
        res.setEncoding('utf8');
        res.on('data', chunk => body+= chunk);
        res.on('end', () => console.log('File uploaded as', body));
    }
}

module.exports = SaveOperation;
