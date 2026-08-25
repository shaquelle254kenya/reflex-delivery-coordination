# Reflex — Delivery Coordination for Small Retailers

A working system for the Readiness Sprint case study: small Kenyan retailers log delivery requests, a dispatcher assigns them to riders, and riders update status through to a scanned/typed proof-of-delivery confirmation.

## Structure
```
reflex/
├── README.md
├── backend/
│   ├── package.json
│   └── src/
│       ├── server.js       — Express API (all routes)
│       ├── store.js        — data layer (JSON-file-backed)
│       └── server.test.js  — full lifecycle + edge-case tests
├── frontend/
│   └── index.html          — single-page app, 3 role tabs (Retailer/Dispatcher/Rider)
└── docs/
    ├── architecture.md     — design decisions and why
    ├── trade-offs.md       — 3+ named weak points, honestly justified
    ├── demo-script.md      — live walk-through + anticipated hard questions
    └── timing-log.md       — technical timing + presentation dry-run template
```

## Run it

**Backend:**
```bash
cd backend
npm install
npm start
```
Listens on port `5057` by default (`PORT` env var to override). **Avoid port 6000** — Chrome blocks it as an "unsafe port" (a historical X11 rule), so the frontend would silently fail to connect.

**Run the tests:**
```bash
cd backend
npm test
```

**Frontend:**
Just open `frontend/index.html` directly in a browser, or serve it:
```bash
cd frontend
python3 -m http.server 8080
```
Then visit `http://localhost:8080`. Confirm the "API base URL" field at the top matches wherever your backend is running.

## Demo data
Three riders are seeded automatically on first run: Brian Otieno, Faith Wanjiru, Musa Abdi. No login is required — see `docs/trade-offs.md` for why, and what a production version would add.
