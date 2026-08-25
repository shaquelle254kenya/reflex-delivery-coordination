// src/server.js
const express = require('express');
const QRCode = require('qrcode');
const store = require('./store');

const app = express();
app.use(express.json());

// Allow the frontend (served separately, or opened as a local file) to call this API.
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// --- Retailer: log a new delivery request ---
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

// --- Anyone: list deliveries, optionally filtered ---
// Dispatcher uses ?status=requested to see open work.
// Rider uses ?riderId=2 to see their own assigned work.
app.get('/deliveries', (req, res) => {
  const { status, riderId } = req.query;
  res.json(store.getAllDeliveries({ status, riderId }));
});

app.get('/deliveries/:id', (req, res) => {
  const delivery = store.getDelivery(req.params.id);
  if (!delivery) return res.status(404).json({ error: 'not_found' });
  res.json(delivery);
});

// --- Dispatcher: assign an open request to a rider ---
app.patch('/deliveries/:id/assign', (req, res) => {
  const { riderId } = req.body || {};
  if (!riderId) return res.status(400).json({ error: 'riderId is required' });

  const result = store.assignDelivery(req.params.id, riderId);
  if (result.error === 'not_found') return res.status(404).json({ error: 'delivery not found' });
  if (result.error === 'rider_not_found') return res.status(400).json({ error: 'unknown riderId' });
  if (result.error === 'invalid_transition') {
    return res.status(409).json({ error: `cannot assign a delivery that is already "${result.from}"` });
  }
  res.json(result.delivery);
});

// --- Rider: mark picked up from the retailer ---
app.patch('/deliveries/:id/pickup', (req, res) => {
  const { riderId } = req.body || {};
  if (!riderId) return res.status(400).json({ error: 'riderId is required' });

  const result = store.markPickedUp(req.params.id, riderId);
  if (result.error === 'not_found') return res.status(404).json({ error: 'delivery not found' });
  if (result.error === 'not_your_delivery') return res.status(403).json({ error: 'delivery is assigned to a different rider' });
  if (result.error === 'invalid_transition') {
    return res.status(409).json({ error: `cannot mark picked up from status "${result.from}"` });
  }
  res.json(result.delivery);
});

// --- Rider: confirm final delivery via scanned/typed code (proof of delivery) ---
app.post('/deliveries/:id/confirm', (req, res) => {
  const { code } = req.body || {};
  if (!code) return res.status(400).json({ error: 'code is required' });

  const result = store.confirmDelivered(req.params.id, code);
  if (result.error === 'not_found') return res.status(404).json({ error: 'delivery not found' });
  if (result.error === 'bad_code') return res.status(400).json({ error: 'confirmation code does not match' });
  if (result.error === 'invalid_transition') {
    return res.status(409).json({ error: `cannot confirm delivery from status "${result.from}" — must be picked_up first` });
  }
  res.json(result.delivery);
});

// --- QR code image for a delivery's confirmation code (for the retailer to print/show) ---
app.get('/deliveries/:id/qr', async (req, res) => {
  const delivery = store.getDelivery(req.params.id);
  if (!delivery) return res.status(404).json({ error: 'not_found' });

  const dataUrl = await QRCode.toDataURL(delivery.confirmationCode, { width: 220 });
  res.json({ deliveryId: delivery.id, confirmationCode: delivery.confirmationCode, qrDataUrl: dataUrl });
});

app.get('/riders', (req, res) => {
  res.json(store.getRiders());
});

app.get('/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 5057; // 6000 is a Chrome-blocked "unsafe port" (X11), avoid it
if (require.main === module) {
  app.listen(PORT, () => console.log(`reflex-api listening on :${PORT}`));
}

module.exports = app;
