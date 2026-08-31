const store = require('./store');
const { login, requireAuth, JWT_SECRET } = require('./auth');
const jwt = require('jsonwebtoken');

console.log('--- Testing SQLite store ---');
const delivery = store.createDelivery({
  customerName: 'Test Customer',
  customerPhone: '0700000000',
  address: 'Test Address',
  itemDescription: 'Test Item',
});
console.log('Created:', delivery.id, delivery.status);

const assigned = store.assignDelivery(delivery.id, 1);
console.log('Assigned:', assigned.delivery.status, 'to rider', assigned.delivery.riderId);

const pickedUp = store.markPickedUp(delivery.id, 1);
console.log('Picked up:', pickedUp.delivery.status);

const confirmed = store.confirmDelivered(delivery.id, delivery.confirmationCode);
console.log('Delivered:', confirmed.delivery.status);

console.log('\n--- Testing auth ---');
const fakeReq = { body: { name: 'Brian Otieno', password: 'password123' } };
const fakeRes = { json: (data) => console.log('Login success, got token:', !!data.token), status: () => fakeRes };
login(fakeReq, fakeRes);

const wrongReq = { body: { name: 'Brian Otieno', password: 'wrongpassword' } };
let wrongPasswordStatusCode = null;
const wrongRes = {
  status: (code) => { wrongPasswordStatusCode = code; return wrongRes; },
  json: () => console.log('Wrong password correctly rejected with status', wrongPasswordStatusCode),
};
login(wrongReq, wrongRes);

console.log('\n--- Testing requireAuth middleware ---');
const token = jwt.sign({ riderId: 1, name: 'Brian Otieno' }, JWT_SECRET);
const authedReq = { get: () => `Bearer ${token}` };
requireAuth(authedReq, { status: () => ({ json: () => {} }) }, () => {
  console.log('Valid token accepted, req.user.riderId =', authedReq.user.riderId);
});

const noAuthReq = { get: () => '' };
requireAuth(noAuthReq, { status: (code) => ({ json: (d) => console.log('No token correctly rejected with status', code, d.error) }) }, () => {
  console.log('unexpected: should not reach next()');
});

console.log('\nAll checks ran.');
