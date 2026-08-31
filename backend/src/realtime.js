// src/realtime.js
//
// STARTER for feature/realtime-websockets
//
// Fixes trade-off #3 in docs/trade-offs.md: the frontend currently polls
// every 4 seconds (see frontend/index.html: setInterval(refreshAll, 4000)).
// This replaces that with instant push updates over Socket.io.
//
// How to wire this into server.js:
//   1. const http = require('http').createServer(app);
//   2. const { attachRealtime, broadcastDeliveryUpdate } = require('./realtime');
//   3. attachRealtime(http);
//   4. Replace `app.listen(PORT, ...)` with `http.listen(PORT, ...)`
//   5. After every store mutation (assign, pickup, confirm), call
//      broadcastDeliveryUpdate(updatedDelivery) instead of just res.json(...)

const { Server } = require('socket.io');

let io = null;

function attachRealtime(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: '*' }, // matches the existing permissive CORS in server.js
  });

  io.on('connection', (socket) => {
    console.log('[realtime] client connected:', socket.id);
    socket.on('disconnect', () => console.log('[realtime] client disconnected:', socket.id));
  });

  return io;
}

// Call this any time a delivery's status changes — every connected client
// (retailer, dispatcher, rider views) gets the update instantly instead of
// waiting for their next poll.
function broadcastDeliveryUpdate(delivery) {
  if (!io) throw new Error('attachRealtime() must be called before broadcasting');
  io.emit('delivery:update', delivery);
}

module.exports = { attachRealtime, broadcastDeliveryUpdate };
