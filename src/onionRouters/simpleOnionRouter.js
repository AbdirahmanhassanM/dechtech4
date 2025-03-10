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
exports.OnionRouter = void 0;
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
const config_1 = require("../config");
const crypto_1 = require("../users/crypto");
const aesCrypto_1 = require("../crypto/aesCrypto"); // Adjust the path as necessary
class OnionRouter {
    constructor(nodeId) {
        this.app = (0, express_1.default)();
        this.lastEncryptedMessage = null;
        this.lastDecryptedMessage = null;
        this.lastMessageDestination = null;
        this.nodeId = nodeId;
        this.port = config_1.BASE_ONION_ROUTER_PORT + nodeId;
        const keys = (0, crypto_1.generateKeyPair)();
        this.privateKey = keys.privateKey;
        this.publicKey = keys.publicKey;
        this.app.use(express_1.default.json());
        this.app.get('/status', (req, res) => res.send('live'));
        this.app.get('/getLastReceivedEncryptedMessage', (req, res) => {
            res.json({ result: this.lastEncryptedMessage });
        });
        this.app.get('/getLastReceivedDecryptedMessage', (req, res) => {
            res.json({ result: this.lastDecryptedMessage });
        });
        this.app.get('/getLastDecryptedMessage', (req, res) => res.json({ result: this.lastDecryptedMessage }));
        this.app.post('/message', this.handleMessage.bind(this));
        this.registerWithRegistry();
        this.start();
    }
    registerWithRegistry() {
        return __awaiter(this, void 0, void 0, function* () {
            yield axios_1.default.post(`http://localhost:${config_1.REGISTRY_PORT}/registerNode`, {
                nodeId: this.nodeId,
                pubKey: this.publicKey,
            });
            console.log(`Node ${this.nodeId} registered with registry`);
        });
    }
    handleMessage(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { message } = req.body;
            this.lastEncryptedMessage = message;
            // Extract encrypted AES key from message
            const encryptedKey = message.substring(0, 344); // RSA-2048 produces 344 base64 characters
            const encryptedData = message.substring(344);
            // Decrypt AES key using private key
            const aesKey = (0, crypto_1.decryptRSA)(this.privateKey, encryptedKey);
            // Decrypt the actual message using AES
            const decryptedMessage = (0, aesCrypto_1.decryptAES)(aesKey, encryptedData);
            // Extract next node destination from first 10 characters
            this.lastMessageDestination = parseInt(decryptedMessage.substring(0, 10), 10);
            this.lastDecryptedMessage = decryptedMessage.substring(10);
            // Forward to the next node
            yield axios_1.default.post(`http://localhost:${this.lastMessageDestination}/message`, { message: this.lastDecryptedMessage });
            res.json({ success: true });
        });
    }
    start() {
        this.app.listen(this.port, () => {
            console.log(`Node ${this.nodeId} running on port ${this.port}`);
        });
    }
}
exports.OnionRouter = OnionRouter;
