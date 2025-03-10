import express from 'express';
import { REGISTRY_PORT } from '../config';

class Registry {
  private app = express();
  private nodes: { nodeId: number; pubKey: string }[] = [];

  constructor() {
    this.app.use(express.json());

    // Health check route
    this.app.get('/status', (req, res) => {
      res.send('live');
    });

    // Register a node
    this.app.post('/registerNode', (req, res) => {
      const { nodeId, pubKey } = req.body;
      this.nodes.push({ nodeId, pubKey });
      res.json({ success: true });
    });

    // Retrieve all registered nodes
    this.app.get('/getNodeRegistry', (req, res) => {
      res.json({ nodes: this.nodes });
    });

    this.start();
  }

  private start() {
    this.app.listen(REGISTRY_PORT, () => {
      console.log(`Registry running on port ${REGISTRY_PORT}`);
    });
  }
}

// Start the registry
new Registry();
