import express, { Request, Response, RequestHandler } from 'express';
import axios from 'axios';
import { BASE_NODE_PORT, REGISTRY_PORT } from '../config';
import { generateKeyPair, decryptRSA, decryptAES } from '../crypto';

export async function startOnionRouter(nodeId: number) {
  const port = BASE_NODE_PORT + nodeId;
  const app = express();
  app.use(express.json());

  // Generate key pair
  const { publicKey, privateKey } = generateKeyPair();

  // Store last received messages and destination
  let lastReceivedEncryptedMessage: string | null = null;
  let lastReceivedDecryptedMessage: string | null = null;
  let lastMessageDestination: number | null = null;

  // Health check route
  app.get('/status', ((req, res) => {
    res.send('live');
  }) as RequestHandler);

  // Get last received encrypted message
  app.get('/getLastReceivedEncryptedMessage', ((req, res) => {
    res.json({ result: lastReceivedEncryptedMessage });
  }) as RequestHandler);

  // Get last received decrypted message
  app.get('/getLastReceivedDecryptedMessage', ((req, res) => {
    res.json({ result: lastReceivedDecryptedMessage });
  }) as RequestHandler);

  // Get last message destination
  app.get('/getLastMessageDestination', ((req, res) => {
    res.json({ result: lastMessageDestination });
  }) as RequestHandler);

  // Get private key
  app.get('/getPrivateKey', ((req, res) => {
    res.json({ result: privateKey });
  }) as RequestHandler);

  // Handle incoming messages
  app.post('/message', (async (req, res) => {
    try {
      console.log(`[Node ${port}] Received message:`, req.body);
      
      // If we receive a message with encryptedKey and encryptedMessage, it's an onion layer
      if (req.body.message) {
        // Try to parse the message as JSON first to see if it's an onion layer
        try {
          const parsedMessage = JSON.parse(req.body.message);
          if (parsedMessage.encryptedKey && parsedMessage.encryptedMessage) {
            lastReceivedEncryptedMessage = parsedMessage.encryptedMessage;
            lastMessageDestination = parsedMessage.nextNodePort;

            // Decrypt the AES key using our private key
            const decryptedKey = decryptRSA(parsedMessage.encryptedKey, privateKey);
            
            // Decrypt the message using the decrypted AES key
            const decryptedMessage = decryptAES(parsedMessage.encryptedMessage, decryptedKey);
            lastReceivedDecryptedMessage = decryptedMessage;

            // Try to parse the decrypted message as JSON
            try {
              const nextLayerMessage = JSON.parse(decryptedMessage);
              console.log(`[Node ${port}] Forwarding to next node:`, parsedMessage.nextNodePort);
              
              // Forward to next node
              await axios.post(`http://localhost:${parsedMessage.nextNodePort}/message`, {
                message: decryptedMessage
              });
            } catch (parseError) {
              // If it's not JSON, it's the final message for a user
              console.log(`[Node ${port}] Delivering final message to port ${parsedMessage.nextNodePort}`);
              await axios.post(`http://localhost:${parsedMessage.nextNodePort}/message`, {
                message: decryptedMessage
              });
            }
          } else {
            // Direct message to forward
            console.log(`[Node ${port}] Forwarding direct message to port ${req.body.nextNodePort}`);
            await axios.post(`http://localhost:${req.body.nextNodePort}/message`, {
              message: req.body.message
            });
          }
        } catch (parseError) {
          // If parsing fails, treat it as a direct message
          console.log(`[Node ${port}] Forwarding direct message to port ${req.body.nextNodePort}`);
          await axios.post(`http://localhost:${req.body.nextNodePort}/message`, {
            message: req.body.message
          });
        }
      }

      res.json({ success: true });
    } catch (error) {
      console.error(`[Node ${port}] Error processing message:`, error);
      res.status(500).json({ error: 'Failed to process message' });
    }
  }) as RequestHandler);

  // Register with the registry
  try {
    await axios.post(`http://localhost:${REGISTRY_PORT}/registerNode`, {
      nodeId,
      pubKey: publicKey
    });
  } catch (error) {
    console.error(`Failed to register node ${nodeId}:`, error);
  }

  const server = app.listen(port, () => {
    console.log(`Node registered on port ${port}`);
  });

  return server;
} 