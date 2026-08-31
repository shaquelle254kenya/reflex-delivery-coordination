// src/auth.js
//
// STARTER for feature/database-and-auth
//
// Fixes trade-off #2 in docs/trade-offs.md: right now, a rider's identity is
// just "whatever riderId the client sent" — nothing stops a client from lying
// about who they are. This gives every rider a real login and a signed token,
// so the server can trust req.user instead of req.body.riderId.

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const store = require('./store');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production'; // TODO: real secret via env var

function login(req, res) {
  const { name, password } = req.body || {};
  const rider = store.getRiderByName(name);
  if (!rider || !bcrypt.compareSync(password || '', rider.passwordHash)) {
    return res.status(401).json({ error: 'invalid credentials' });
  }

  const token = jwt.sign({ riderId: rider.id, name: rider.name, role: 'rider' }, JWT_SECRET, { expiresIn: '12h' });
  res.json({ token, rider: { id: rider.id, name: rider.name } });
}

// Middleware: verifies the token and attaches the real identity to req.user.
// Routes that need to know "which rider is this" should read req.user.riderId,
// NOT req.body.riderId — that's the whole point of this fix.
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
