// src/store.js
//
// STARTER for feature/database-and-auth
//
// Drop-in replacement for the original JSON-file store — same method names,
// same return shapes — so server.js and the tests barely need to change.
// This is the fix for trade-off #1 in docs/trade-offs.md (no transactions,
// risk of concurrent writes clobbering each other).

const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'reflex.db'));
db.pragma('journal_mode = WAL'); // safe concurrent reads while a write is in progress

db.exec(`
  CREATE TABLE IF NOT EXISTS riders (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    passwordHash TEXT
  );

  CREATE TABLE IF NOT EXISTS deliveries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customerName TEXT NOT NULL,
    customerPhone TEXT NOT NULL,
    address TEXT NOT NULL,
    itemDescription TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'requested',
    riderId INTEGER,
    confirmationCode TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    FOREIGN KEY (riderId) REFERENCES riders(id)
  );
`);

// Seed demo riders once (TODO: replace with a real signup flow — passwords
// below are placeholders, see auth.js for how login checks them)
const riderCount = db.prepare('SELECT COUNT(*) as n FROM riders').get().n;
if (riderCount === 0) {
  const bcrypt = require('bcryptjs');
  const insert = db.prepare('INSERT INTO riders (id, name, phone, passwordHash) VALUES (?, ?, ?, ?)');
  const demoHash = bcrypt.hashSync('password123', 10); // TODO: real passwords per rider
  insert.run(1, 'Brian Otieno', '0711000001', demoHash);
  insert.run(2, 'Faith Wanjiru', '0711000002', demoHash);
  insert.run(3, 'Musa Abdi', '0711000003', demoHash);
}

function generateConfirmationCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

const store = {
  getAllDeliveries(filter = {}) {
    let query = 'SELECT * FROM deliveries WHERE 1=1';
    const params = [];
    if (filter.status) { query += ' AND status = ?'; params.push(filter.status); }
    if (filter.riderId) { query += ' AND riderId = ?'; params.push(Number(filter.riderId)); }
    return db.prepare(query).all(...params);
  },

  getDelivery(id) {
    return db.prepare('SELECT * FROM deliveries WHERE id = ?').get(Number(id));
  },

  createDelivery({ customerName, customerPhone, address, itemDescription }) {
    const now = new Date().toISOString();
    const code = generateConfirmationCode();
    const result = db.prepare(`
      INSERT INTO deliveries (customerName, customerPhone, address, itemDescription, status, riderId, confirmationCode, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, 'requested', NULL, ?, ?, ?)
    `).run(customerName, customerPhone, address, itemDescription, code, now, now);
    return store.getDelivery(result.lastInsertRowid);
  },

  assignDelivery(id, riderId) {
    const delivery = store.getDelivery(id);
    if (!delivery) return { error: 'not_found' };
    if (delivery.status !== 'requested') return { error: 'invalid_transition', from: delivery.status };
    const rider = db.prepare('SELECT * FROM riders WHERE id = ?').get(Number(riderId));
    if (!rider) return { error: 'rider_not_found' };

    db.prepare('UPDATE deliveries SET riderId = ?, status = ?, updatedAt = ? WHERE id = ?')
      .run(rider.id, 'assigned', new Date().toISOString(), delivery.id);
    return { delivery: store.getDelivery(id) };
  },

  markPickedUp(id, riderId) {
    const delivery = store.getDelivery(id);
    if (!delivery) return { error: 'not_found' };
    if (delivery.status !== 'assigned') return { error: 'invalid_transition', from: delivery.status };
    if (delivery.riderId !== Number(riderId)) return { error: 'not_your_delivery' };

    db.prepare('UPDATE deliveries SET status = ?, updatedAt = ? WHERE id = ?')
      .run('picked_up', new Date().toISOString(), delivery.id);
    return { delivery: store.getDelivery(id) };
  },

  confirmDelivered(id, code) {
    const delivery = store.getDelivery(id);
    if (!delivery) return { error: 'not_found' };
    if (delivery.status !== 'picked_up') return { error: 'invalid_transition', from: delivery.status };
    if (delivery.confirmationCode !== String(code).toUpperCase()) return { error: 'bad_code' };

    db.prepare('UPDATE deliveries SET status = ?, updatedAt = ? WHERE id = ?')
      .run('delivered', new Date().toISOString(), delivery.id);
    return { delivery: store.getDelivery(id) };
  },

  getRiders() {
    return db.prepare('SELECT id, name, phone FROM riders').all(); // never return passwordHash
  },

  getRiderByName(name) {
    return db.prepare('SELECT * FROM riders WHERE name = ?').get(name);
  },

  _resetForTests() {
    db.exec('DELETE FROM deliveries; DELETE FROM sqlite_sequence WHERE name="deliveries";');
  },
};

module.exports = store;
