const crypto = require('crypto');
const util = require('util');
const randomBytes = util.promisify(crypto.randomBytes);

const HASHING_ALG = 'SHA256';
const CIPHER_ALG = 'aes-128-cbc';

class MessageProtocol {

    constructor(ourPrivateKey) {
        this.ourPrivateKey = ourPrivateKey;
    }

    serialize(body, theirPublicKey = null) {

        const bodyJSON = JSON.stringify(body);
        const signature = crypto.createSign(HASHING_ALG).update(bodyJSON).sign(this.ourPrivateKey, 'base64');
        const bodyText = `${signature}\n${bodyJSON}`;

        return Promise.resolve()
            .then(() => {

                if (!theirPublicKey) {
                    return bodyText;
                }

                return Promise.all([
                    randomBytes(16),
                    randomBytes(16)
                ]).then(([ secret, iv ]) => {

                    const asymmetricSecret = crypto.publicEncrypt(theirPublicKey, secret).toString('base64');
                    const asymmetricIv = crypto.publicEncrypt(theirPublicKey, iv).toString('base64');
                    const cipher = crypto.createCipheriv(CIPHER_ALG, secret, iv);
                    let symmetric = cipher.update(bodyText, 'utf8', 'base64');
                    symmetric+= cipher.final('base64');

                    return `${asymmetricSecret}\n${asymmetricIv}\n${symmetric}`;
                });

            })
            .then(bodyText => `${theirPublicKey ? '1' : '0'}\n${bodyText}`);
    }

    deserialize(message) {

        return Promise.resolve(message.toString()).then(message => {

            const pieces = message.split('\n');
            const encrypted = pieces.shift() === '1';

            if (encrypted) {
                const asymmetricSecret = pieces.shift();
                const asymmetricIv = pieces.shift();
                const symmetric = pieces.shift();
                if ([ asymmetricSecret, asymmetricIv, symmetric ].includes(undefined)) {
                    throw new Error('Invalid message format.');
                }

                const secret = crypto.privateDecrypt(this.ourPrivateKey, Buffer.from(asymmetricSecret, 'base64'));
                const iv = crypto.privateDecrypt(this.ourPrivateKey, Buffer.from(asymmetricIv, 'base64'));
                const decipher = crypto.createDecipheriv(CIPHER_ALG, secret, iv);
                let bodyText = decipher.update(symmetric, 'base64', 'utf8');
                bodyText+= decipher.final('utf8');
                pieces.push(...bodyText.split('\n'));
            }

            const signature = pieces.shift();
            const bodyJSON = pieces.join('\n');

            const body = bodyJSON.length ? JSON.parse(bodyJSON) : '';

            return {
                body,
                verifySignature(theirPublicKey) {

                    return crypto.createVerify(HASHING_ALG).update(bodyJSON).verify(theirPublicKey, signature, 'base64');
                }
            };
        });
    }
}

module.exports = MessageProtocol;
