// src/store.js
//
// Deliberately simple: an in-memory store that persists to a local JSON file
// on every write. This is a conscious architecture choice for this sprint,
// not an oversight — see docs/architecture.md and docs/trade-offs.md for the
// reasoning and what would change for production scale.

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data.json');

function load() {
  if (!fs.existsSync(DATA_FILE)) {
    return { deliveries: [], riders: seedRiders(), nextDeliveryId: 1 };
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function seedRiders() {
  return [
    { id: 1, name: 'Brian Otieno', phone: '0711000001' },
    { id: 2, name: 'Faith Wanjiru', phone: '0711000002' },
    { id: 3, name: 'Musa Abdi', phone: '0711000003' },
  ];
}

let state = load();

function save() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2));
}

function generateConfirmationCode() {
  // Short, human-typeable fallback in case a camera scan isn't possible —
  // the same code is also encoded into the QR image.
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

const store = {
  getAllDeliveries(filter = {}) {
    let results = state.deliveries;
    if (filter.status) results = results.filter((d) => d.status === filter.status);
    if (filter.riderId) results = results.filter((d) => d.riderId === Number(filter.riderId));
    return results;
  },

  getDelivery(id) {
    return state.deliveries.find((d) => d.id === Number(id));
  },

  createDelivery({ customerName, customerPhone, address, itemDescription }) {
    const delivery = {
      id: state.nextDeliveryId++,
      customerName,
      customerPhone,
      address,
      itemDescription,
      status: 'requested', // requested -> assigned -> picked_up -> delivered
      riderId: null,
      confirmationCode: generateConfirmationCode(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    state.deliveries.push(delivery);
    save();
    return delivery;
  },

  assignDelivery(id, riderId) {
    const delivery = store.getDelivery(id);
    if (!delivery) return { error: 'not_found' };
    if (delivery.status !== 'requested') return { error: 'invalid_transition', from: delivery.status };
    const rider = state.riders.find((r) => r.id === Number(riderId));
    if (!rider) return { error: 'rider_not_found' };

    delivery.riderId = rider.id;
    delivery.status = 'assigned';
    delivery.updatedAt = new Date().toISOString();
    save();
    return { delivery };
  },

  markPickedUp(id, riderId) {
    const delivery = store.getDelivery(id);
    if (!delivery) return { error: 'not_found' };
    if (delivery.status !== 'assigned') return { error: 'invalid_transition', from: delivery.status };
    if (delivery.riderId !== Number(riderId)) return { error: 'not_your_delivery' };

    delivery.status = 'picked_up';
    delivery.updatedAt = new Date().toISOString();
    save();
    return { delivery };
  },

  confirmDelivered(id, code) {
    const delivery = store.getDelivery(id);
    if (!delivery) return { error: 'not_found' };
    if (delivery.status !== 'picked_up') return { error: 'invalid_transition', from: delivery.status };
    if (delivery.confirmationCode !== String(code).toUpperCase()) return { error: 'bad_code' };

    delivery.status = 'delivered';
    delivery.updatedAt = new Date().toISOString();
    save();
    return { delivery };
  },

  getRiders() {
    return state.riders;
  },

  // Test-only helper: reset to a clean slate without restarting the process.
  _resetForTests() {
    state = { deliveries: [], riders: seedRiders(), nextDeliveryId: 1 };
    save();
  },
};

module.exports = store;
