const Datastore = require("nedb-promise");
const path = require("path");

/**
 * NeDB With Encryption & Decryption
 * Last Update 12 Feb 2020
 *
 * @author : Herlangga Sefani Wijaya <https://github.com/gaibz>
 * link: https://gist.github.com/gaibz/84a3148a278907da6072162ec8223c0b
 */

//const crypto = require("crypto");

//let algorithm = "aes-256-cbc";
//let secret = "superSecretKey";
//let key = crypto
//  .createHash("sha256")
//  .update(String(secret))
//  .digest("base64")
//  .substr(0, 32);

console.log(path.join(__dirname + "/tpdiscord.db"));
const configStore = new Datastore({
  filename: path.join(__dirname + "/tpdiscord.db"),
  autoload: true,
  //afterSerialization(plaintext) {
  //  const iv = crypto.randomBytes(16);
  //  const aes = crypto.createCipheriv(algorithm, key, iv);
  //  let ciphertext = aes.update(plaintext);
  //  ciphertext = Buffer.concat([iv, ciphertext, aes.final()]);
  //  return ciphertext.toString("base64");
  //},
  //beforeDeserialization(ciphertext) {
  //  const ciphertextBytes = Buffer.from(ciphertext, "base64");
  //  const iv = ciphertextBytes.slice(0, 16);
  //  const data = ciphertextBytes.slice(16);
  //  const aes = crypto.createDecipheriv(algorithm, key, iv);
  //  let plaintextBytes = Buffer.from(aes.update(data));
  //  plaintextBytes = Buffer.concat([plaintextBytes, aes.final()]);
  //  return plaintextBytes.toString();
  //}
});

exports.db = configStore;
