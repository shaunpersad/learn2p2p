
class Operation {

    optionsHandler(options) {

        return options;
    }

    requestHandler(req) {

    }

    responseHandler(res) {

    }

    errorHandler(err) {
        console.log(err.message);
    }

    failureStatusCodeHandler(res) {

        let body = '';
        res.setEncoding('utf8');
        res.on('data', chunk => body+= chunk);
        res.on('end', () => console.log('Error:', body));
    }
}

module.exports = Operation;