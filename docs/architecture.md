# Reflex — Architecture

## The problem, restated
Small Kenyan retailers (electronics shops, pharmacies, hardware stores) coordinate deliveries over WhatsApp and phone calls. There's no record of who's assigned, no status visibility for the retailer, and no proof of delivery. Reflex replaces that with a shared system across three roles: **retailer staff** log requests, a **dispatcher** assigns them to **riders**, and riders update status as the delivery moves.

## Stack
- **Backend**: Node.js + Express. Chosen for speed of building and testing within a one-week time-box, and because REST + JSON is the simplest possible contract between three different client views (retailer, dispatcher, rider) that all need to read and mutate the same delivery records.
- **Persistence**: a local JSON file, loaded into memory on boot and rewritten on every write (`backend/src/store.js`). This is a deliberate simplification for the sprint, not an oversight — see `trade-offs.md` for exactly why and what it costs.
- **Frontend**: a single static HTML/CSS/JS page with three tab-switched views (Retailer / Dispatcher / Rider), calling the backend directly over `fetch`. No build step, no framework — chosen because the whole surface area is one list, one form, and a handful of buttons; a framework would be overhead the problem doesn't need yet.
- **Real-time updates**: client-side polling every 4 seconds, not WebSockets. See `trade-offs.md`.

## Data model
One core entity, `Delivery`:

| Field | Type | Notes |
|---|---|---|
| `id` | number | auto-incrementing |
| `customerName`, `customerPhone`, `address`, `itemDescription` | string | captured by retailer staff at creation, all required |
| `status` | enum | `requested` → `assigned` → `picked_up` → `delivered` — a strict linear state machine, enforced server-side |
| `riderId` | number, nullable | set when a dispatcher assigns the delivery |
| `confirmationCode` | string | generated at creation, used as proof-of-delivery at the final step |
| `createdAt`, `updatedAt` | ISO timestamp | |

A second, much smaller entity, `Rider` (id, name, phone), is seeded with three demo riders rather than built out with a full rider-management UI — there was no requirement to create/edit riders this sprint, just to assign to one.

## How assignment works
The dispatcher's view fetches `GET /deliveries?status=requested` — every delivery still in its initial state, i.e. the open queue. Assigning calls `PATCH /deliveries/:id/assign` with a `riderId`. The server enforces two things at this step: the target delivery must currently be `requested` (you can't assign something already assigned, midair-flight, or delivered), and the `riderId` must exist. Get either wrong and the API returns a clear error rather than silently corrupting state.

## How status updates flow
Status only ever moves forward, one step at a time, and only the right actor can move it:
- **Dispatcher** moves `requested → assigned`.
- **Rider** moves `assigned → picked_up`, and only if the delivery is assigned to *that* rider (checked via `riderId` match — see trade-offs re: this being a stand-in for real auth).
- **Rider** moves `picked_up → delivered`, but only by submitting the correct `confirmationCode` — this is the proof-of-delivery step. Getting the code wrong, or trying to confirm before pickup, is rejected.

Each of these transitions is enforced in `store.js`, not just in the UI — so even if a client sent requests out of order or skipped a step, the server would refuse it. This was tested directly (see `backend/src/server.test.js`): marking picked-up before assignment, confirming with a wrong code, and confirming before pickup are all explicitly tested to fail with the right HTTP status.

## What happens outside the app
- **QR-based confirmation**: at creation, each delivery gets a random `confirmationCode`. `GET /deliveries/:id/qr` returns that code rendered as a QR image (via the `qrcode` npm package). In the real flow, this would be printed on the retailer's receipt or shown on their screen when handing goods to the rider; the rider scans it at the point of delivery to confirm. In this build, the rider's screen also accepts the code typed manually as a fallback (useful for the demo, and realistic — not every phone camera situation is ideal in the field).
- **SMS/WhatsApp notifications** to the customer (e.g., "your delivery is on the way") are explicitly *not* built this sprint — the case study doesn't ask for a customer-facing channel, only that the retailer has visibility. Noted as a roadmap item, not a gap in this sprint's scope.

## Why this design, in one sentence per decision
- **REST over GraphQL/gRPC**: three simple, independent views reading/writing one resource — REST's simplicity wins over GraphQL's flexibility, which pays off with more complex, deeply-nested client queries this app doesn't have.
- **One combined frontend over three separate apps**: a real product would ship separate retailer/dispatcher/rider experiences (possibly one being a native rider app for offline/GPS support), but for proving the *system* works end-to-end in a week, one page with role tabs demonstrates the same contract with a fraction of the build time.
- **Server-enforced state machine over trusting the client**: a dispatcher's screen and a rider's screen are built by the same codebase today, but won't always be — enforcing transitions server-side means the rules hold even as new clients (a future native app, a USSD interface for feature phones) are added later.
