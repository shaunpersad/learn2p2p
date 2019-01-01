
function saveHandler(codec, req, res) {

    codec.encode(req).catch(err => err.message).then(payload => res.end(payload));
}

module.exports = saveHandler;
