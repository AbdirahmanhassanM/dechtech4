import crypto from 'crypto';

// Generate RSA Key Pair
export function generateKeyPair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
  });
  return {
    publicKey: publicKey.export({ type: 'spki', format: 'pem' }),
    privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }),
  };
}

// Encrypt with RSA
export function encryptRSA(publicKey: string, data: string) {
  return crypto.publicEncrypt(publicKey, Buffer.from(data)).toString('base64');
}

// Decrypt with RSA
export function decryptRSA(privateKey: string, encryptedData: string) {
  return crypto.privateDecrypt(privateKey, Buffer.from(encryptedData, 'base64')).toString();
}
