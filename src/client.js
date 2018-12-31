#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const getSocket = require('./utils/getSocket');

const [ command, ...args ] = process.argv.slice(2);
const socketPath = getSocket();
const options = { socketPath };
const errorHandler = err => console.log(err.message);
let requestHandler = req => req.end();
let responseHandler = res => {

    let body = '';
    res.setEncoding('utf8');
    res.on('data', chunk => body+= chunk);
    res.on('end', () => console.log(body));
};

switch (command) {
    case 'fetch':
        const [ hash, destination ] = args;
        options.path = `/${hash}`;
        if (!hash || !destination) {
            return console.log('Invalid arguments.');
        }
        const writeFile = fs.createWritableStream(destination).on('error', errorHandler);
        console.log('Fetching file...');
        responseHandler = res => res.pipe(writeFile).on('finish', () => console.log('File downloaded.'));
        break;
    case 'save':
        const [ source ] = args;
        options.method = 'POST';
        if (!source) {
            return console.log('Invalid arguments.');
        }
        const readFile = fs.createReadableStream(source).on('error', errorHandler);
        console.log('Saving file...');
        requestHandler = req => readFile.pipe(req);
        break;
    default:
        return console.log('No valid command found.');
}

const req = http.request(options, res => {

    console.log(`status: ${res.statusCode}`);

    responseHandler(res);

}).on('error', errorHandler);

requestHandler(req);

