const Codec = require('./Codec');

const codec = new Codec();
const content = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque interdum rutrum sodales. Nullam mattis fermentum libero, non volutpat. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque interdum rutrum sodales. Nullam mattis fermentum libero, non volutpat.';

codec
    .encode(content)
    .then(hash => {

        console.log('hash', hash);

        return codec.decode(hash);
    })
    .then(decoded => {

        console.log('success', decoded === content);

        return codec.hashes();
    })
    .then(hashes => {

        console.log(hashes);
    });