import express, { Request, Response, RequestHandler } from 'express';
import axios from 'axios';
import { BASE_USER_PORT, REGISTRY_PORT, BASE_NODE_PORT } from '../config';
import { generateAESKey, encryptAES, encryptRSA } from '../crypto';

interface Node {
  nodeId: number;
  pubKey: string;
}

export async function startUser(userId: number) {
  const port = BASE_USER_PORT + userId;
  const app = express();
  app.use(express.json());

  // Store last received and sent messages
  let lastReceivedMessage: string | null = null;
  let lastSentMessage: string | null = null;

  // Health check route
  app.get('/status', ((req, res) => {
    res.send('live');
  }) as RequestHandler);

  // Get last received message
  app.get('/getLastReceivedMessage', ((req, res) => {
    res.json({ result: lastReceivedMessage });
  }) as RequestHandler);

  // Get last sent message
  app.get('/getLastSentMessage', ((req, res) => {
    res.json({ result: lastSentMessage });
  }) as RequestHandler);

  // Receive a message
  app.post('/message', ((req, res) => {
    console.log(`[User ${port}] Received message:`, req.body);
    const { message } = req.body;
    lastReceivedMessage = message;
    res.json({ success: true });
  }) as RequestHandler);

  // Send a message through the onion network
  app.post('/sendMessage', (async (req, res) => {
    try {
      const { message, destinationUserId } = req.body;
      console.log(`[User ${port}] Sending message to user ${destinationUserId}:`, message);
      lastSentMessage = message;

      // Get the node registry
      const registryResponse = await axios.get(`http://localhost:${REGISTRY_PORT}/getNodeRegistry`);
      const nodes: Node[] = registryResponse.data.nodes;

      if (nodes.length < 3) {
        throw new Error('Not enough nodes available');
      }

      // Select 3 random nodes
      const selectedNodes = nodes.sort(() => Math.random() - 0.5).slice(0, 3);
      console.log(`[User ${port}] Selected nodes:`, selectedNodes.map((n: Node) => n.nodeId));

      // Create the onion layers
      const destinationPort = BASE_USER_PORT + destinationUserId;
      let currentMessage = message;
      let nextNodePort = destinationPort;

      // Create layers in reverse order (from last node to first)
      for (let i = selectedNodes.length - 1; i >= 0; i--) {
        const node = selectedNodes[i];
        const aesKey = generateAESKey();
        
        // Encrypt the current message with a new AES key
        const encryptedMessage = encryptAES(currentMessage, aesKey);
        
        // Encrypt the AES key with the node's public key
        const encryptedKey = encryptRSA(aesKey, node.pubKey);
        
        // Create the layer
        currentMessage = JSON.stringify({
          encryptedKey,
          encryptedMessage,
          nextNodePort
        });
        
        // The next iteration will send to this node's port
        nextNodePort = BASE_NODE_PORT + node.nodeId;
      }

      // Send to first node
      console.log(`[User ${port}] Sending to first node:`, selectedNodes[0].nodeId);
      await axios.post(`http://localhost:${BASE_NODE_PORT + selectedNodes[0].nodeId}/message`, {
        message: currentMessage,
        nextNodePort: BASE_NODE_PORT + selectedNodes[1].nodeId
      });

      res.json({ success: true });
    } catch (error) {
      console.error(`[User ${port}] Error sending message:`, error);
      res.status(500).json({ error: 'Failed to send message' });
    }
  }) as RequestHandler);

  const server = app.listen(port, () => {
    console.log(`User running on port ${port}`);
  });

  return server;
} 