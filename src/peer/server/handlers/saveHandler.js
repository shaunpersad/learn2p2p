
function saveHandler(codec, req, res) {

    codec.encode(req)
        .then(hash => codec.upload(hash))
        .catch(err => err.message)
        .then(payload => res.end(payload));
}

module.exports = saveHandler;
