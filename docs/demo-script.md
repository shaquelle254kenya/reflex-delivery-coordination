# Reflex — Demo Script

Target: ~3 minutes of live demo inside a 10-minute presentation slot. Practice this until it needs no narration filler — every click should have a one-sentence reason attached.

## Setup before you start
1. Terminal 1: `cd backend && npm install && npm start` (confirm you see `reflex-api listening on :5057`)
2. Terminal 2: `cd frontend && python3 -m http.server 8080` (or open `index.html` directly and just point the API base field at wherever the backend is running)
3. Open `http://localhost:8080` in a browser. Confirm the API base field at the top reads the correct URL.
4. Do one silent practice delivery beforehand so you know the confirmation code will show up correctly — don't let the live one be your first time.

## The walk-through

**1. Retailer (30s)**
> "This is a pharmacy logging a delivery — customer, phone, address, what they're sending."
- Fill the form, hit **Log delivery request**.
- Point at the new ticket appearing with status **REQUESTED**.

**2. Dispatcher (30s)**
> "The dispatcher sees every open request in one queue — no more scrolling WhatsApp for who's waiting."
- Switch to the Dispatcher tab, point at the ticket in the open list.
- Pick a rider from the dropdown, hit **Assign**.
- Point out it disappears from "open" and appears in "all active deliveries" as **ASSIGNED**.

**3. Rider (45s)**
> "The rider only sees what's theirs — and can't jump ahead in the process."
- Switch to Rider tab, select the rider you just assigned to.
- Hit **Mark picked up** — status becomes **PICKED UP**.
- This is the proof-of-delivery moment: explain the confirmation code was generated the moment the request was created, and would normally be scanned via QR at the doorstep.
- Type/paste the code, hit **Confirm delivered**.
- Point out it disappears from the rider's active list — job done.

**4. Close the loop (15s)**
- Switch back to Retailer tab.
> "And the retailer's own screen already shows DELIVERED — no phone call needed to find out."

## If something goes wrong live
- **Wrong confirmation code rejected**: this is a feature, not a bug — say so out loud. "That's the proof-of-delivery check working — a wrong code doesn't get accepted."
- **A step is attempted out of order** (e.g. trying pickup before assignment): same — narrate it as the state machine doing its job, and move on with the correct order.
- **Network hiccup / server not reachable**: have a fallback — a short screen recording of a working run, recorded during a dry run, ready to play instead of live-debugging in front of the panel.

## Anticipated hard questions (rehearse answers using State → Context → Evidence)
- *"What stops a rider from marking something delivered without actually delivering it?"* → State: the confirmation code check. Context: the code is only known to the retailer (and shown via QR to whoever the rider hands the code check to). Evidence: `server.test.js` has an explicit test proving a wrong code is rejected with a 400.
- *"What happens if two dispatchers assign the same request at once?"* → State: currently a real race condition given the file-based store. Context: acceptable at current scale (one dispatcher per retailer, low request volume). Evidence: named explicitly in `trade-offs.md`, with the fix (a real database with transactions) already identified.
- *"Why not build this as three separate mobile apps?"* → State: chose one shared web page with role tabs instead. Context: proves the underlying contract (the API) is correct and workflow-complete before investing in three separate native experiences. Evidence: the same API serves all three tabs today with zero role-specific backend code — splitting the frontend later is a UI change, not an API redesign.
