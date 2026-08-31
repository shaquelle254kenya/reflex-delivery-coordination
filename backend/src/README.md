# Starter: feature/database-and-auth

Fixes trade-off #1 and #2 from `docs/trade-offs.md`.

## Files here
- `store.js` — drop-in replacement for `backend/src/store.js`, same method names/shapes, but backed by real SQLite instead of a JSON file. Includes WAL mode so concurrent reads don't block on writes.
- `auth.js` — JWT login + a `requireAuth` middleware. Riders log in with name+password, get a token, and `req.user.riderId` becomes the trusted source of identity instead of `req.body.riderId`.
- `verify.js` — a script proving both files work: full delivery lifecycle against real SQLite, correct login, correct rejection of a wrong password, and correct token verification. Already run and passing:
  ```
  npm install better-sqlite3 express jsonwebtoken bcryptjs
  node verify.js
  ```

## To wire this into the real backend
1. This IS now the real `backend/src/store.js` — already wired in.
2. `auth.js` is added, but not yet called from `server.js`. Still to do:
   - Add `const { login, requireAuth } = require('./auth');`
   - Add `app.post('/login', login);`
   - Add `requireAuth` as middleware on `/deliveries/:id/pickup` and `/deliveries/:id/confirm` — then read `req.user.riderId` instead of trusting `req.body.riderId`.
3. Update `frontend/index.html`'s rider view to log in first (POST /login) and store the returned token, sending it as an `Authorization: Bearer <token>` header on pickup/confirm calls.

## Still to do (real work, not done here)
- A real signup/password-set flow — right now all 3 demo riders share the password `password123`, seeded once in `store.js`. Fine for a demo, not for real riders.
- Move `JWT_SECRET` out of a hardcoded fallback into a required environment variable.
- Add a dispatcher login too — currently only riders get accounts.
