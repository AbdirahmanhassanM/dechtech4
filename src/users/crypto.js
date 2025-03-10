"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateKeyPair = generateKeyPair;
exports.encryptRSA = encryptRSA;
exports.decryptRSA = decryptRSA;
const crypto_1 = __importDefault(require("crypto"));
// Generate RSA Key Pair
function generateKeyPair() {
    const { publicKey, privateKey } = crypto_1.default.generateKeyPairSync('rsa', {
        modulusLength: 2048,
    });
    return {
        publicKey: publicKey.export({ type: 'spki', format: 'pem' }),
        privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }),
    };
}
// Encrypt with RSA
function encryptRSA(publicKey, data) {
    return crypto_1.default.publicEncrypt(publicKey, Buffer.from(data)).toString('base64');
}
// Decrypt with RSA
function decryptRSA(privateKey, encryptedData) {
    return crypto_1.default.privateDecrypt(privateKey, Buffer.from(encryptedData, 'base64')).toString();
}
