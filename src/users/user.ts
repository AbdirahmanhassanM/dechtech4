import express from 'express';
import axios from 'axios';
import { BASE_USER_PORT, REGISTRY_PORT, BASE_ONION_ROUTER_PORT } from '../config';
import { generateAESKey, encryptAES, encryptRSA } from '../crypto';

export class User {
  private app = express();
  private userId: number;
  private port: number;
  private lastReceivedMessage: string | null = null;
  private lastSentMessage: string | null = null;

  constructor(userId: number) {
    this.userId = userId;
    this.port = BASE_USER_PORT + userId;

    this.app.use(express.json());

    this.app.get('/status', (req, res) => res.send('live'));
    this.app.get('/getLastReceivedMessage', (req, res) => res.json({ result: this.lastReceivedMessage }));
    this.app.post('/sendMessage', this.sendMessage.bind(this));

    this.start();
  }

  private async sendMessage(req, res) {
    const { message, destinationUserId } = req.body;

    const registry = await axios.get(`http://localhost:${REGISTRY_PORT}/getNodeRegistry`);
    const nodes = registry.data.nodes;
    const circuit = nodes.sort(() => 0.5 - Math.random()).slice(0, 3); // Select 3 random nodes

    let encryptedMessage = message;
    for (const node of circuit.reverse()) {
      const symKey = generateAESKey();
      encryptedMessage = encryptAES(symKey, encryptedMessage);
      const encryptedSymKey = encryptRSA(node.pubKey, symKey);
      encryptedMessage = encryptedSymKey + encryptedMessage;
    }

    await axios.post(`http://localhost:${circuit[0].nodeId + BASE_ONION_ROUTER_PORT}/message`, {
      message: encryptedMessage,
    });

    res.json({ success: true });
  }

  private start() {
    this.app.listen(this.port, () => {
      console.log(`User ${this.userId} running on port ${this.port}`);
    });
  }
}