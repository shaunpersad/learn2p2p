const crypto = require('crypto');
const HashStore = require('./HashStore');
const Block = require('./Block');

class Codec {

    constructor(settings = {}) {

        this.settings = Object.assign({
            maxDataLength: 65,
            maxNumLinks: 2,
            hashStore: new HashStore()
        }, settings);
    }

    /**
     * Converts a hash to the original string content.
     * It does this by walking the blocks and concatenating their data.
     *
     * @param {string} hash
     * @returns {Promise<string>}
     */
    decode(hash) {

        const { hashStore } = this.settings;

        return hashStore.get(hash) // get the block for this hash
            .then(block => {

                /**
                 * We want to add our block's data to the data in its links.
                 * To do this, we will recursively resolve its links into their data.
                 */
                return Promise.all([
                    Promise.resolve(block.data) // this block's data
                ].concat(
                    block.links.map(hash => this.decode(hash)) // convert links into data
                ));

            })
            .then(chunks => chunks.join('')); // concatenate them all
    }

    /**
     * Converts a string into blocks and returns the root block's hash.
     * It recursively creates links as necessary.
     * This algorithm tries to create as many "data-heavy" blocks as possible,
     * rather than "link-heavy".
     *
     * @param {string} data
     * @returns {Promise<string>}
     */
    encode(data) {

        const { hashStore, maxDataLength, maxNumLinks } = this.settings;
        const block = new Block(data, maxDataLength);

        /**
         * Populate the block with links if necessary.
         */
        const createLinks = () => {

            let p = Promise.resolve();

            /**
             * If there are chunks of data beyond maxDataLength,
             * let's create links to them.
             */
            if ((data = data.substring(maxDataLength)) && block.links.length < maxNumLinks) {

                p = p.then(() => {

                        /**
                         * If we're not about to create the max link,
                         * create a new link to the current chunk.
                         */
                        if (block.links.length < maxNumLinks - 1) {

                            const linkedBlock = new Block(data, maxDataLength);

                            return hashStore.set(linkedBlock); // returns the hash to the linked block.
                        }

                        /**
                         * If we are about to create the max link,
                         * make sure it's a link to a block that represents
                         * the remaining data, rather than the current chunk.
                         */
                        return this.encode(data); // returns the hash to the new block.
                    })
                    .then(hash => block.links.push(hash)) // add new links
                    .then(() => createLinks()); // recursively create more links if necessary.
            }

            return p;
        };

        return createLinks().then(() => {

            /**
             * Create and save the root block.
             */
            return hashStore.set(block);
        });
    }

    hashes() {
        return this.settings.hashStore.all();
    }
}

module.exports = Codec;
