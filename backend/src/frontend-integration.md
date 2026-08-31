STARTER for feature/realtime-websockets — frontend half.

In frontend/index.html:

1. Add this script tag in <head>, before your existing <script>:
   ```
   <script src="https://cdn.socket.io/4.7.5/socket.io.min.js"></script>
   ```

2. Replace this line near the bottom of the existing <script>:
   ```
   refreshAll();
   setInterval(refreshAll, 4000); // simple polling — see docs/trade-offs.md
   ```
   with:
   ```
   refreshAll(); // still call once on load to populate initial state

   const socket = io(apiBase()); // connects to the same backend URL
   socket.on('delivery:update', () => {
     // Simplest correct approach: just re-fetch everything on any change.
     refreshAll();
   });
   ```

That's it — no more 4-second delay. Every view updates the instant any
other view causes a status change.
