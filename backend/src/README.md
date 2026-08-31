# Starter: feature/customer-notifications

New capability from the roadmap — not fixing an existing trade-off, adding what `docs/architecture.md` explicitly listed as out-of-scope for the first sprint.

## Files here
- `notifications.js` — `composeMessage(status, delivery)` builds the SMS text for each status; `sendStatusNotification(delivery)` actually sends it via Africa's Talking.
- `verify.js` — tests `composeMessage` for all 4 statuses (pure logic, no network needed) and confirms `sendStatusNotification` fails safely (not silently) when no API key is configured. Already run and passing.

## What's tested vs. not
- Message text for assigned, picked_up, delivered, and requested (no message) — verified directly, no credentials needed.
- Safe fallback when AT_API_KEY isn't set — logs and returns {sent: false} instead of crashing or pretending to succeed.
- NOT tested: actually sending a real SMS — this needs a real Africa's Talking account. Sign up and test this part yourself before considering it done.

## Setup
1. Sign up at https://account.africastalking.com (free)
2. Get your sandbox username + API key
3. In the sandbox, add your own phone number as a "simulator number" in the dashboard — sandbox SMS only reaches numbers you've registered there
4. Run with:
   ```
   AT_USERNAME=sandbox AT_API_KEY=your-key-here node verify.js
   ```

## To wire this into the real backend
In server.js, after each successful transition (assign, pickup, confirm), call:
```
const { sendStatusNotification } = require('./notifications');
sendStatusNotification(result.delivery); // fire-and-forget — don't await this in the response path
```
Don't await it before responding to the client — a slow/failed SMS shouldn't delay or break the actual status update.

## Still to do
- WhatsApp is mentioned in the roadmap alongside SMS — Africa's Talking doesn't do WhatsApp directly; that would need Twilio's WhatsApp API or Meta's Cloud API instead.
- No retry logic if the SMS API call fails — currently just logs and moves on.
