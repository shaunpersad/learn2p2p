
function fetchHandler(codec, req, res) {

    const [ hash ] = req.url.split('/').filter(piece => !!piece);
    if (!hash) {
        res.statusCode = 400;
        return res.end('No hash found in URL.');
    }

    codec.decode(hash, res).catch(err => res.statusCode = 500 && res.end(err.message));
}

module.exports = fetchHandler;
