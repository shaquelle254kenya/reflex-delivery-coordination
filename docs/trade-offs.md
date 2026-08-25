# Reflex — Trade-off Log

Three real weak points in this build, named up front rather than waiting to be caught.

## 1. Persistence is a JSON file, not a real database
**What it is**: `store.js` keeps everything in memory and rewrites a single JSON file on every write. There's no transaction support, no indexing, and if two writes happened at the exact same instant, the second `fs.writeFileSync` could clobber the first.

**Why I accepted it anyway**: for a single-process demo with one dispatcher and a handful of riders, true write concurrency is very unlikely, and the entire dataset is small enough that "load it all into memory" is not a real performance problem. Building this against SQLite or Postgres would have cost setup time and a migration story I didn't have room for in a one-week sprint, for a risk that doesn't materialize at this scale.

**What I'd do with more time**: move to SQLite for a single-retailer deployment (still no server to run, still simple) or Postgres if Reflex needs to serve multiple retailers from one backend — either would give real transactions and remove the "two writes at once" risk entirely.

## 2. No real authentication — role is just "which tab you're on"
**What it is**: the dispatcher and rider views aren't protected by a login. A rider's identity is just "whichever name is selected in a dropdown," not a verified session. The pickup-authorization check (`riderId` must match) is real code, but it only checks a value the client sends — there's nothing stopping a client from lying about which rider it is.

**Why I accepted it anyway**: the case study's personas are about *workflow* (who does what step), not about access control, and building real auth (login, sessions/JWTs, per-role permissions) would have been a significant chunk of the time-box spent on a concern the brief didn't ask me to solve this week.

**What I'd do with more time**: add real authentication (a simple JWT per rider/dispatcher login) and derive the rider's identity from the verified session instead of a client-supplied `riderId` — the pickup/confirm endpoints would then trust the token, not the request body.

## 3. Real-time updates are 4-second polling, not push
**What it is**: the frontend polls all three views every 4 seconds rather than the dispatcher/rider screens updating the instant something changes.

**Why I accepted it anyway**: polling is trivial to build and debug (it's literally the same `GET` request repeated), and for a delivery-status app, a few seconds of latency between "rider marks picked up" and "dispatcher's screen reflects it" is not a meaningfully worse experience than a WhatsApp message arriving with a similar delay — which is the status quo this replaces.

**What I'd do with more time**: move to WebSockets (or Server-Sent Events, simpler for a one-way server→client update) so status changes appear instantly and to cut the wasted requests from constant polling when nothing has changed.

## A fourth, smaller one worth naming
**Confirmation code has no expiry or single-use enforcement beyond the state machine.** Once a delivery is `delivered`, the code can't be reused (the transition only fires from `picked_up`), but nothing stops someone from seeing the code before the rider gets there and trying to "confirm" a delivery early — though that attempt would fail unless the delivery has genuinely reached `picked_up` status first. Accepted as low-risk for this scope, since the code is only shown to the retailer and (via QR) the rider, not published anywhere.
