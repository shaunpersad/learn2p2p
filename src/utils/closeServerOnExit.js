
function once(fn) {

    let fired = false;

    return function() {
        if (!fired) {
            fired = true;
            fn.apply(fn, arguments);
        }
    };
}

function closeServerOnExit(server) {

    const close = once(callback => server.close(callback));

    // //do something when app is closing
    process.on('exit', close);

    //catches ctrl+c event
    process.on('SIGINT', () => close(() => process.exit(0)));
    //
    // catches "kill pid" (for example: nodemon restart)
    process.on('SIGUSR1', () => close(() => process.exit(0)));
    process.on('SIGUSR2', () => close(() => process.exit(0)));
}

module.exports = closeServerOnExit;
