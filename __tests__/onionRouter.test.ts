import { startOnionRouter } from '../src/onionRouters/simpleOnionRouter';
import { startUser } from '../src/users/user';
import { startRegistry } from '../src/registry/registry';
import axios from 'axios';
import { Server } from 'http';

describe('Onion Router Network', () => {
  let registry: Server;
  let nodes: Server[] = [];
  let users: Server[] = [];

  beforeAll(async () => {
    // Start registry
    registry = await startRegistry();

    // Start nodes
    for (let i = 1; i <= 3; i++) {
      const node = await startOnionRouter(i);
      nodes.push(node);
    }

    // Start users
    for (let i = 1; i <= 2; i++) {
      const user = await startUser(i);
      users.push(user);
    }
  });

  afterAll(async () => {
    // Close all servers
    await Promise.all([
      registry.close(),
      ...nodes.map(node => node.close()),
      ...users.map(user => user.close())
    ]);
  });

  test('Registry server is live', async () => {
    const response = await axios.get('http://localhost:3000/status');
    expect(response.data).toBe('live');
  });

  test('Nodes can register with registry', async () => {
    const response = await axios.get('http://localhost:3000/getNodeRegistry');
    expect(response.data.nodes).toBeDefined();
  });

  test('Users can send and receive messages', async () => {
    const message = 'Hello through the onion network!';
    await axios.post('http://localhost:5001/sendMessage', {
      message,
      destinationUserId: 2
    });

    // Wait for message to be delivered
    await new Promise(resolve => setTimeout(resolve, 1000));

    const response = await axios.get('http://localhost:5002/getLastReceivedMessage');
    expect(response.data.result).toBe(message);
  });

  test('Nodes are functioning correctly', async () => {
    const response = await axios.get('http://localhost:4001/status');
    expect(response.data).toBe('live');
  });
}); 