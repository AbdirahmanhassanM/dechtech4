import crypto from 'crypto';

// Generate RSA key pair
export function generateKeyPair(): { publicKey: string; privateKey: string } {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });
  return { publicKey, privateKey };
}

// Generate a random AES key
export function generateAESKey(): string {
  const key = crypto.randomBytes(32); // 256-bit key
  return key.toString('base64');
}

// Encrypt data using AES
export function encryptAES(data: string, key: string): string {
  const keyBuffer = Buffer.from(key, 'base64');
  const iv = crypto.randomBytes(16); // 128-bit IV
  const cipher = crypto.createCipheriv('aes-256-cbc', keyBuffer, iv);
  let encrypted = cipher.update(data, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return iv.toString('base64') + ':' + encrypted;
}

// Decrypt data using AES
export function decryptAES(encryptedData: string, key: string): string {
  const keyBuffer = Buffer.from(key, 'base64');
  const [ivString, data] = encryptedData.split(':');
  const iv = Buffer.from(ivString, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, iv);
  let decrypted = decipher.update(data, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Encrypt data using RSA
export function encryptRSA(data: string, publicKey: string): string {
  const buffer = Buffer.from(data);
  const encrypted = crypto.publicEncrypt(
    {
      key: publicKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    },
    buffer
  );
  return encrypted.toString('base64');
}

// Decrypt data using RSA
export function decryptRSA(encryptedData: string, privateKey: string): string {
  const buffer = Buffer.from(encryptedData, 'base64');
  const decrypted = crypto.privateDecrypt(
    {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    },
    buffer
  );
  return decrypted.toString('utf8');
} 