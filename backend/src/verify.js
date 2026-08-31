const express = require('express');
const http = require('http');
const { Server: IOClient } = require('socket.io-client');
const { attachRealtime, broadcastDeliveryUpdate } = require('./realtime');

const app = express();
const server = http.createServer(app);
attachRealtime(server);

server.listen(4501, () => {
  console.log('test server up on :4501');

  const client = require('socket.io-client')('http://localhost:4501');

  client.on('connect', () => {
    console.log('client connected:', client.id);

    client.on('delivery:update', (delivery) => {
      console.log('CLIENT RECEIVED PUSH UPDATE:', delivery);
      client.close();
      server.close(() => {
        console.log('test complete — realtime push confirmed working');
        process.exit(0);
      });
    });

    // Simulate what server.js would do after, say, a pickup confirmation
    setTimeout(() => {
      console.log('server broadcasting a delivery update...');
      broadcastDeliveryUpdate({ id: 42, status: 'picked_up' });
    }, 300);
  });
});

setTimeout(() => {
  console.error('TIMEOUT — client never received the push update');
  process.exit(1);
}, 5000);
