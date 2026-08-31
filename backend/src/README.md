# Starter: feature/realtime-websockets

Fixes trade-off #3 from `docs/trade-offs.md`.

## Files here
- `realtime.js` — Socket.io setup: `attachRealtime(httpServer)` wires it into your Express app, `broadcastDeliveryUpdate(delivery)` pushes an event to every connected client.
- `frontend-integration.md` — exact snippet to replace the polling loop in `frontend/index.html` with a socket listener.
- `verify.js` — a real server + real client test proving the push actually arrives. Already run and passing:
  ```
  npm install express socket.io socket.io-client
  node verify.js
  ```
  Output confirms: server starts, client connects, server broadcasts, client receives the exact payload — no polling involved.

## To wire this into the real backend
1. Add `backend/src/realtime.js` — already here.
2. In `server.js`, change:
   ```
   app.listen(PORT, () => ...);
   ```
   to:
   ```
   const http = require('http').createServer(app);
   const { attachRealtime, broadcastDeliveryUpdate } = require('./realtime');
   attachRealtime(http);
   http.listen(PORT, () => ...);
   ```
3. After every successful state change (assign, pickup, confirm), call `broadcastDeliveryUpdate(result.delivery)` in addition to `res.json(result.delivery)`.
4. Follow `frontend-integration.md` to swap the frontend's polling for a socket listener.

## Still to do
- Right now `broadcastDeliveryUpdate` sends to everyone connected — fine at this scale (one retailer), but a multi-retailer version would want to scope broadcasts to a room per retailer.
- No reconnection-state handling yet: if a client's socket drops and reconnects, it should re-fetch once on reconnect in case it missed an update while disconnected.
