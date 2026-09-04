const request = require('supertest');
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'reflex.db');

let app;
let store;
let token;

function cleanDb() {
  ['reflex.db', 'reflex.db-shm', 'reflex.db-wal'].forEach((f) => {
    const p = path.join(__dirname, f);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  });
}

beforeEach(async () => {
  jest.resetModules();
  cleanDb();
  store = require('./store');
  ({ app } = require('./server'));

  const loginRes = await request(app).post('/login').send({ name: 'Brian Otieno', password: 'password123' });
  token = loginRes.body.token;
});

afterAll(() => {
  cleanDb();
});

describe('POST /login', () => {
  it('issues a token for correct credentials', async () => {
    const res = await request(app).post('/login').send({ name: 'Brian Otieno', password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
  });

  it('rejects wrong password', async () => {
    const res = await request(app).post('/login').send({ name: 'Brian Otieno', password: 'wrong' });
    expect(res.status).toBe(401);
  });
});

describe('POST /deliveries (retailer, no auth needed)', () => {
  it('creates a delivery with status requested', async () => {
    const res = await request(app).post('/deliveries').send({
      customerName: 'Jane Doe', customerPhone: '0722000000', address: 'Kilimani', itemDescription: 'Charger',
    });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('requested');
  });

  it('rejects missing fields', async () => {
    const res = await request(app).post('/deliveries').send({ customerName: 'Jane Doe' });
    expect(res.status).toBe(400);
  });
});

describe('Full authenticated lifecycle', () => {
  it('walks a delivery through every stage with a real token', async () => {
    const create = await request(app).post('/deliveries').send({
      customerName: 'Amina', customerPhone: '0733000000', address: 'Eastleigh', itemDescription: 'Monitor',
    });
    const id = create.body.id;
    const code = create.body.confirmationCode;

    const assign = await request(app).patch(`/deliveries/${id}/assign`).send({ riderId: 1 });
    expect(assign.body.status).toBe('assigned');

    const noAuthPickup = await request(app).patch(`/deliveries/${id}/pickup`).send({});
    expect(noAuthPickup.status).toBe(401);

    const pickup = await request(app).patch(`/deliveries/${id}/pickup`).set('Authorization', `Bearer ${token}`).send({});
    expect(pickup.status).toBe(200);
    expect(pickup.body.status).toBe('picked_up');

    const confirm = await request(app).post(`/deliveries/${id}/confirm`).set('Authorization', `Bearer ${token}`).send({ code });
    expect(confirm.status).toBe(200);
    expect(confirm.body.status).toBe('delivered');
  });

  it('rejects pickup with a wrong/expired token', async () => {
    const create = await request(app).post('/deliveries').send({
      customerName: 'A', customerPhone: 'B', address: 'C', itemDescription: 'D',
    });
    await request(app).patch(`/deliveries/${create.body.id}/assign`).send({ riderId: 1 });

    const res = await request(app).patch(`/deliveries/${create.body.id}/pickup`).set('Authorization', 'Bearer not-a-real-token').send({});
    expect(res.status).toBe(401);
  });

  it('rejects confirming with the wrong code even with valid auth', async () => {
    const create = await request(app).post('/deliveries').send({
      customerName: 'A', customerPhone: 'B', address: 'C', itemDescription: 'D',
    });
    const id = create.body.id;
    await request(app).patch(`/deliveries/${id}/assign`).send({ riderId: 1 });
    await request(app).patch(`/deliveries/${id}/pickup`).set('Authorization', `Bearer ${token}`).send({});

    const res = await request(app).post(`/deliveries/${id}/confirm`).set('Authorization', `Bearer ${token}`).send({ code: 'WRONG' });
    expect(res.status).toBe(400);
  });
});

describe('Rider location reporting', () => {
  it('requires auth', async () => {
    const res = await request(app).post('/riders/1/location').send({ lat: -1.29, lng: 36.82 });
    expect(res.status).toBe(401);
  });

  it('saves location with valid auth', async () => {
    const res = await request(app).post('/riders/1/location').set('Authorization', `Bearer ${token}`).send({ lat: -1.29, lng: 36.82 });
    expect(res.status).toBe(200);

    const riders = await request(app).get('/riders');
    const brian = riders.body.find((r) => r.id === 1);
    expect(brian.lastLat).toBe(-1.29);
  });
});

describe('QR code generation', () => {
  it('generates a scannable QR code', async () => {
    const create = await request(app).post('/deliveries').send({
      customerName: 'A', customerPhone: 'B', address: 'C', itemDescription: 'D',
    });
    const res = await request(app).get(`/deliveries/${create.body.id}/qr`);
    expect(res.status).toBe(200);
    expect(res.body.qrDataUrl).toMatch(/^data:image\/png;base64,/);
  });
});
