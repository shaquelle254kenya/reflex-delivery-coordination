// src/auth.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const store = require('./store');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

function login(req, res) {
  const { name, password } = req.body || {};
  const rider = store.getRiderByName(name);
  if (!rider || !bcrypt.compareSync(password || '', rider.passwordHash)) {
    return res.status(401).json({ error: 'invalid credentials' });
  }

  const token = jwt.sign({ riderId: rider.id, name: rider.name, role: 'rider' }, JWT_SECRET, { expiresIn: '12h' });
  res.json({ token, rider: { id: rider.id, name: rider.name } });
}

function requireAuth(req, res, next) {
  const header = req.get('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'missing Authorization header' });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: 'invalid or expired token' });
  }
}

module.exports = { login, requireAuth, JWT_SECRET };
