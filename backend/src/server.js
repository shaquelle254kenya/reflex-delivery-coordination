// src/server.js
//
// v2: everything wired together.
// - Rider identity now comes from a verified JWT (auth.js), not a client-
//   supplied riderId, for pickup/confirm/location actions.
// - Every successful state change broadcasts instantly over Socket.io
//   (realtime.js) instead of clients polling.
// - Every successful state change also attempts an SMS to the customer
//   (notifications.js) — fires-and-forgets, never blocks the response.
// - New POST /riders/:id/location for the native rider app branch.

const express = require('express');
const http = require('http');
const QRCode = require('qrcode');
const store = require('./store');
const { login, requireAuth } = require('./auth');
const { attachRealtime, broadcastDeliveryUpdate } = require('./realtime');
const { sendStatusNotification } = require('./notifications');

const app = express();
const server = http.createServer(app);
attachRealtime(server);

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use(express.json());

// --- Auth ---
app.post('/login', login);

// --- Retailer: log a new delivery request (no auth - matches original scope) ---
app.post('/deliveries', (req, res) => {
  const { customerName, customerPhone, address, itemDescription } = req.body || {};
  const missing = ['customerName', 'customerPhone', 'address', 'itemDescription'].filter(
    (field) => !req.body || !String(req.body[field] || '').trim(),
  );
  if (missing.length > 0) {
    return res.status(400).json({ error: 'validation_failed', missing });
  }

  const delivery = store.createDelivery({
    customerName: customerName.trim(),
    customerPhone: customerPhone.trim(),
    address: address.trim(),
    itemDescription: itemDescription.trim(),
  });
  res.status(201).json(delivery);
});

app.get('/deliveries', (req, res) => {
  const { status, riderId } = req.query;
  res.json(store.getAllDeliveries({ status, riderId }));
});

app.get('/deliveries/:id', (req, res) => {
  const delivery = store.getDelivery(req.params.id);
  if (!delivery) return res.status(404).json({ error: 'not_found' });
  res.json(delivery);
});

// --- Dispatcher: assign (no auth - matches original scope, dispatcher login not yet built) ---
app.patch('/deliveries/:id/assign', (req, res) => {
  const { riderId } = req.body || {};
  if (!riderId) return res.status(400).json({ error: 'riderId is required' });

  const result = store.assignDelivery(req.params.id, riderId);
  if (result.error === 'not_found') return res.status(404).json({ error: 'delivery not found' });
  if (result.error === 'rider_not_found') return res.status(400).json({ error: 'unknown riderId' });
  if (result.error === 'invalid_transition') {
    return res.status(409).json({ error: `cannot assign a delivery that is already "${result.from}"` });
  }

  broadcastDeliveryUpdate(result.delivery);
  sendStatusNotification(result.delivery); // fire-and-forget
  res.json(result.delivery);
});

// --- Rider: pickup - NOW REQUIRES AUTH, identity from token not request body ---
app.patch('/deliveries/:id/pickup', requireAuth, (req, res) => {
  const riderId = req.user.riderId;

  const result = store.markPickedUp(req.params.id, riderId);
  if (result.error === 'not_found') return res.status(404).json({ error: 'delivery not found' });
  if (result.error === 'not_your_delivery') return res.status(403).json({ error: 'delivery is assigned to a different rider' });
  if (result.error === 'invalid_transition') {
    return res.status(409).json({ error: `cannot mark picked up from status "${result.from}"` });
  }

  broadcastDeliveryUpdate(result.delivery);
  sendStatusNotification(result.delivery);
  res.json(result.delivery);
});

// --- Rider: confirm - NOW REQUIRES AUTH (any logged-in rider with the right code) ---
app.post('/deliveries/:id/confirm', requireAuth, (req, res) => {
  const { code } = req.body || {};
  if (!code) return res.status(400).json({ error: 'code is required' });

  const result = store.confirmDelivered(req.params.id, code);
  if (result.error === 'not_found') return res.status(404).json({ error: 'delivery not found' });
  if (result.error === 'bad_code') return res.status(400).json({ error: 'confirmation code does not match' });
  if (result.error === 'invalid_transition') {
    return res.status(409).json({ error: `cannot confirm delivery from status "${result.from}" — must be picked_up first` });
  }

  broadcastDeliveryUpdate(result.delivery);
  sendStatusNotification(result.delivery);
  res.json(result.delivery);
});

app.get('/deliveries/:id/qr', async (req, res) => {
  const delivery = store.getDelivery(req.params.id);
  if (!delivery) return res.status(404).json({ error: 'not_found' });
  const dataUrl = await QRCode.toDataURL(delivery.confirmationCode, { width: 220 });
  res.json({ deliveryId: delivery.id, confirmationCode: delivery.confirmationCode, qrDataUrl: dataUrl });
});

app.get('/riders', (req, res) => res.json(store.getRiders()));

// --- New: rider location reporting (for the native rider app branch) ---
app.post('/riders/:id/location', requireAuth, (req, res) => {
  const { lat, lng } = req.body || {};
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json({ error: 'lat and lng must be numbers' });
  }
  const result = store.updateRiderLocation(req.user.riderId, lat, lng);
  if (result.error) return res.status(404).json({ error: result.error });
  res.json({ ok: true });
});

app.get('/health', (req, res) => res.json({ ok: true, version: 'v2' }));

const PORT = process.env.PORT || 5057;
if (require.main === module) {
  server.listen(PORT, () => console.log(`reflex-api v2 listening on :${PORT}`));
}

module.exports = { app, server };
