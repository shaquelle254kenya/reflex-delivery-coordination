// src/notifications.js
//
// STARTER for feature/customer-notifications
//
// Sends an SMS to the customer when their delivery status changes.
// Uses Africa's Talking (https://africastalking.com) — has a free sandbox
// tier that works with Kenyan numbers, good fit for this case study.
//
// SETUP (you'll need to do this yourself — no real credentials were
// available to test live sending):
//   1. Sign up at https://account.africastalking.com (free)
//   2. Get your sandbox API key + username from the dashboard
//   3. Set environment variables before running:
//        AT_USERNAME=sandbox
//        AT_API_KEY=your-key-here
//   4. In the sandbox, you can only send to numbers you've added as
//      simulator numbers in the dashboard.
//
// composeMessage() below is pure logic (no network call) and IS fully
// tested in verify.js without needing real credentials — only the actual
// sendStatusNotification() call needs a real account to verify end-to-end.

const AT_USERNAME = process.env.AT_USERNAME || 'sandbox';
const AT_API_KEY = process.env.AT_API_KEY || '';

function composeMessage(status, delivery) {
  const item = delivery.itemDescription;
  switch (status) {
    case 'assigned':
      return `Reflex: Your delivery (${item}) has been assigned to a rider and will be picked up soon.`;
    case 'picked_up':
      return `Reflex: Your delivery (${item}) has been picked up and is on its way to ${delivery.address}.`;
    case 'delivered':
      return `Reflex: Your delivery (${item}) has been delivered. Thank you for your order!`;
    default:
      return null; // no notification for 'requested' — nothing has happened yet from the customer's POV
  }
}

async function sendStatusNotification(delivery) {
  const message = composeMessage(delivery.status, delivery);
  if (!message) return { sent: false, reason: 'no notification for this status' };

  if (!AT_API_KEY) {
    console.warn('[notifications] AT_API_KEY not set — logging instead of sending:', message);
    return { sent: false, reason: 'no API key configured (dev mode)' };
  }

  const africastalking = require('africastalking')({ username: AT_USERNAME, apiKey: AT_API_KEY });
  const sms = africastalking.SMS;

  try {
    const result = await sms.send({
      to: [delivery.customerPhone],
      message,
    });
    return { sent: true, result };
  } catch (err) {
    console.error('[notifications] SMS send failed:', err.message);
    return { sent: false, reason: err.message };
  }
}

module.exports = { composeMessage, sendStatusNotification };
