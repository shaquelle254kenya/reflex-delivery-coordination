// src/realtime.js
const { Server } = require('socket.io');

let io = null;

function attachRealtime(httpServer) {
  io = new Server(httpServer, { cors: { origin: '*' } });
  io.on('connection', (socket) => {
    console.log('[realtime] client connected:', socket.id);
    socket.on('disconnect', () => console.log('[realtime] client disconnected:', socket.id));
  });
  return io;
}

function broadcastDeliveryUpdate(delivery) {
  if (!io) return; // don't crash if not yet attached (e.g. in tests)
  io.emit('delivery:update', delivery);
}

module.exports = { attachRealtime, broadcastDeliveryUpdate };
