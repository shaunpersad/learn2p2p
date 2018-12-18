const blockFactory = require('./blockFactory');

const content = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque interdum rutrum sodales. Nullam mattis fermentum libero, non volutpat. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque interdum rutrum sodales. Nullam mattis fermentum libero, non volutpat.';
const hashes = {};
const Block = blockFactory(hashes);

const hash = Block.encode(content);
const decoded = Block.decode(hash);

console.log({
    equals: content === decoded,
    hashes,
    hash
});