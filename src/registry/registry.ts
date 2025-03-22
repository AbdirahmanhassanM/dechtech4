import express, { Request, Response, RequestHandler } from 'express';
import { REGISTRY_PORT } from '../config';

interface Node {
  nodeId: number;
  pubKey: string;
}

export async function startRegistry() {
  const app = express();
  app.use(express.json());

  // Store registered nodes
  const nodes: Node[] = [];

  // Health check route
  app.get('/status', ((req, res) => {
    res.send('live');
  }) as RequestHandler);

  // Get node registry
  app.get('/getNodeRegistry', ((req, res) => {
    res.json({ nodes });
  }) as RequestHandler);

  // Register a node
  app.post('/registerNode', ((req, res) => {
    const { nodeId, pubKey } = req.body;
    nodes.push({ nodeId, pubKey });
    res.json({ success: true });
  }) as RequestHandler);

  const server = app.listen(REGISTRY_PORT, () => {
    console.log(`Registry running on port ${REGISTRY_PORT}`);
  });

  return server;
} 