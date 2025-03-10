"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
const config_1 = require("../config");
const crypto_1 = require("../crypto");
class User {
    constructor(userId) {
        this.app = (0, express_1.default)();
        this.lastReceivedMessage = null;
        this.lastSentMessage = null;
        this.userId = userId;
        this.port = config_1.BASE_USER_PORT + userId;
        this.app.use(express_1.default.json());
        this.app.get('/status', (req, res) => res.send('live'));
        this.app.get('/getLastReceivedMessage', (req, res) => res.json({ result: this.lastReceivedMessage }));
        this.app.post('/sendMessage', this.sendMessage.bind(this));
        this.start();
    }
    sendMessage(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { message, destinationUserId } = req.body;
            const registry = yield axios_1.default.get(`http://localhost:${config_1.REGISTRY_PORT}/getNodeRegistry`);
            const nodes = registry.data.nodes;
            const circuit = nodes.sort(() => 0.5 - Math.random()).slice(0, 3); // Select 3 random nodes
            let encryptedMessage = message;
            for (const node of circuit.reverse()) {
                const symKey = (0, crypto_1.generateAESKey)();
                encryptedMessage = (0, crypto_1.encryptAES)(symKey, encryptedMessage);
                const encryptedSymKey = (0, crypto_1.encryptRSA)(node.pubKey, symKey);
                encryptedMessage = encryptedSymKey + encryptedMessage;
            }
            yield axios_1.default.post(`http://localhost:${circuit[0].nodeId + config_1.BASE_ONION_ROUTER_PORT}/message`, {
                message: encryptedMessage,
            });
            res.json({ success: true });
        });
    }
    start() {
        this.app.listen(this.port, () => {
            console.log(`User ${this.userId} running on port ${this.port}`);
        });
    }
}
exports.User = User;
