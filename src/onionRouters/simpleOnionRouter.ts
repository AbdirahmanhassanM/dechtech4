import express from 'express';
import axios from 'axios';
import { BASE_ONION_ROUTER_PORT, REGISTRY_PORT } from '../config';
import { generateKeyPair, decryptRSA } from '../users/crypto';
import { decryptAES } from '../crypto/aesCrypto'; // Adjust the path as necessary


export class OnionRouter {
  private app = express();
  private nodeId: number;
  private port: number;
  private privateKey: string;
  private publicKey: string;
  private lastEncryptedMessage: string | null = null;
  private lastDecryptedMessage: string | null = null;
  private lastMessageDestination: number | null = null;

  constructor(nodeId: number) {
    this.nodeId = nodeId;
    this.port = BASE_ONION_ROUTER_PORT + nodeId;
    const keys = generateKeyPair();
    this.privateKey = keys.privateKey;
    this.publicKey = keys.publicKey;

    this.app.use(express.json());

    this.app.get('/status', (req: express.Request, res: express.Response) => res.send('live'));
    this.app.get('/getLastReceivedEncryptedMessage', (req: express.Request, res: express.Response) => {
      res.json({ result: this.lastEncryptedMessage });
    });
    
    this.app.get('/getLastReceivedDecryptedMessage', (req: express.Request, res: express.Response) => {
      res.json({ result: this.lastDecryptedMessage });
    });
    
    this.app.get('/getLastDecryptedMessage', (req: express.Request, res: express.Response) => res.json({ result: this.lastDecryptedMessage }));    

    this.app.post('/message', this.handleMessage.bind(this));

    this.registerWithRegistry();
    this.start();
  }

  private async registerWithRegistry() {
    await axios.post(`http://localhost:${REGISTRY_PORT}/registerNode`, {
      nodeId: this.nodeId,
      pubKey: this.publicKey,
    });
    console.log(`Node ${this.nodeId} registered with registry`);
  }

  private async handleMessage(req, res) {
    const { message } = req.body;
    this.lastEncryptedMessage = message;

    // Extract encrypted AES key from message
    const encryptedKey = message.substring(0, 344); // RSA-2048 produces 344 base64 characters
    const encryptedData = message.substring(344);

    // Decrypt AES key using private key
    const aesKey = decryptRSA(this.privateKey, encryptedKey);

    // Decrypt the actual message using AES
    const decryptedMessage = decryptAES(aesKey, encryptedData);

    // Extract next node destination from first 10 characters
    this.lastMessageDestination = parseInt(decryptedMessage.substring(0, 10), 10);
    this.lastDecryptedMessage = decryptedMessage.substring(10);

    // Forward to the next node
    await axios.post(`http://localhost:${this.lastMessageDestination}/message`, { message: this.lastDecryptedMessage });

    res.json({ success: true });
  }

  private start() {
    this.app.listen(this.port, () => {
      console.log(`Node ${this.nodeId} running on port ${this.port}`);
    });
  }
}
