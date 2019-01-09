#!/usr/bin/env node

const [ command, ...args ] = process.argv.slice(2);
const options = {
    socketPath: require('../../utils/getSocket')()
};
let operation;

switch (command) {
    case 'fetch':
        const [ hash, destination ] = args;
        const FetchOperation = require('./operations/FetchOperation');
        operation = new FetchOperation(hash, destination);
        break;
    case 'save':
        const [ source ] = args;
        const SaveOperation = require('./operations/SaveOperation');
        operation = new SaveOperation(require('path').resolve(process.cwd(), source));
        break;
    default:
        return console.log('No valid command found.');
}

const errorHandler = operation.errorHandler.bind(operation);
const req = require('http').request(operation.optionsHandler(options), res => {

    if (res.statusCode !== 200) {
        return operation.failureStatusCodeHandler(res);
    }

    res.on('error', errorHandler);

    operation.responseHandler(res);

}).on('error', errorHandler);

operation.requestHandler(req);
