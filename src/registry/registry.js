"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const config_1 = require("../config");
class Registry {
    constructor() {
        this.app = (0, express_1.default)();
        this.nodes = [];
        this.app.use(express_1.default.json());
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
    start() {
        this.app.listen(config_1.REGISTRY_PORT, () => {
            console.log(`Registry running on port ${config_1.REGISTRY_PORT}`);
        });
    }
}
// Start the registry
new Registry();
