const request = require('supertest');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data.json');

let app;
let store;

beforeEach(() => {
  jest.resetModules();
  if (fs.existsSync(DATA_FILE)) fs.unlinkSync(DATA_FILE);
  store = require('./store');
  app = require('./server');
});

afterAll(() => {
  if (fs.existsSync(DATA_FILE)) fs.unlinkSync(DATA_FILE);
});

describe('POST /deliveries (retailer logs a request)', () => {
  it('creates a delivery with status requested', async () => {
    const res = await request(app).post('/deliveries').send({
      customerName: 'Jane Doe',
      customerPhone: '0722000000',
      address: 'Kilimani, Nairobi',
      itemDescription: 'Phone charger',
    });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('requested');
    expect(res.body.confirmationCode).toBeTruthy();
  });

  it('rejects a request missing required fields', async () => {
    const res = await request(app).post('/deliveries').send({ customerName: 'Jane Doe' });
    expect(res.status).toBe(400);
    expect(res.body.missing).toEqual(
      expect.arrayContaining(['customerPhone', 'address', 'itemDescription']),
    );
  });
});

describe('Full lifecycle: requested -> assigned -> picked_up -> delivered', () => {
  it('walks a delivery through every stage correctly', async () => {
    const create = await request(app).post('/deliveries').send({
      customerName: 'Amina Yusuf',
      customerPhone: '0733000000',
      address: 'Eastleigh, Nairobi',
      itemDescription: 'Blood pressure monitor',
    });
    const id = create.body.id;
    const code = create.body.confirmationCode;

    // Dispatcher sees it in the open queue
    const openList = await request(app).get('/deliveries?status=requested');
    expect(openList.body.find((d) => d.id === id)).toBeTruthy();

    // Dispatcher assigns to rider 1
    const assign = await request(app).patch(`/deliveries/${id}/assign`).send({ riderId: 1 });
    expect(assign.status).toBe(200);
    expect(assign.body.status).toBe('assigned');

    // Rider sees it in their queue
    const riderList = await request(app).get('/deliveries?riderId=1');
    expect(riderList.body.find((d) => d.id === id)).toBeTruthy();

    // Rider marks picked up
    const pickup = await request(app).patch(`/deliveries/${id}/pickup`).send({ riderId: 1 });
    expect(pickup.status).toBe(200);
    expect(pickup.body.status).toBe('picked_up');

    // Rider confirms delivery with the correct code
    const confirm = await request(app).post(`/deliveries/${id}/confirm`).send({ code });
    expect(confirm.status).toBe(200);
    expect(confirm.body.status).toBe('delivered');
  });
});

describe('Edge cases and invalid transitions', () => {
  it('rejects assigning a delivery to a nonexistent rider', async () => {
    const create = await request(app).post('/deliveries').send({
      customerName: 'A', customerPhone: 'B', address: 'C', itemDescription: 'D',
    });
    const res = await request(app).patch(`/deliveries/${create.body.id}/assign`).send({ riderId: 999 });
    expect(res.status).toBe(400);
  });

  it('rejects marking picked-up before a delivery is assigned', async () => {
    const create = await request(app).post('/deliveries').send({
      customerName: 'A', customerPhone: 'B', address: 'C', itemDescription: 'D',
    });
    const res = await request(app).patch(`/deliveries/${create.body.id}/pickup`).send({ riderId: 1 });
    expect(res.status).toBe(409);
  });

  it('rejects pickup from a rider the delivery is NOT assigned to', async () => {
    const create = await request(app).post('/deliveries').send({
      customerName: 'A', customerPhone: 'B', address: 'C', itemDescription: 'D',
    });
    await request(app).patch(`/deliveries/${create.body.id}/assign`).send({ riderId: 1 });
    const res = await request(app).patch(`/deliveries/${create.body.id}/pickup`).send({ riderId: 2 });
    expect(res.status).toBe(403);
  });

  it('rejects confirming delivery with the wrong code', async () => {
    const create = await request(app).post('/deliveries').send({
      customerName: 'A', customerPhone: 'B', address: 'C', itemDescription: 'D',
    });
    const id = create.body.id;
    await request(app).patch(`/deliveries/${id}/assign`).send({ riderId: 1 });
    await request(app).patch(`/deliveries/${id}/pickup`).send({ riderId: 1 });

    const res = await request(app).post(`/deliveries/${id}/confirm`).send({ code: 'WRONGCODE' });
    expect(res.status).toBe(400);
  });

  it('rejects confirming delivery before pickup', async () => {
    const create = await request(app).post('/deliveries').send({
      customerName: 'A', customerPhone: 'B', address: 'C', itemDescription: 'D',
    });
    const id = create.body.id;
    await request(app).patch(`/deliveries/${id}/assign`).send({ riderId: 1 });

    const res = await request(app).post(`/deliveries/${id}/confirm`).send({ code: create.body.confirmationCode });
    expect(res.status).toBe(409);
  });

  it('generates a scannable QR code for a delivery', async () => {
    const create = await request(app).post('/deliveries').send({
      customerName: 'A', customerPhone: 'B', address: 'C', itemDescription: 'D',
    });
    const res = await request(app).get(`/deliveries/${create.body.id}/qr`);
    expect(res.status).toBe(200);
    expect(res.body.qrDataUrl).toMatch(/^data:image\/png;base64,/);
  });
});
