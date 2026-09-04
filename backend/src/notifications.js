// src/notifications.js
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
      return null;
  }
}

async function sendStatusNotification(delivery) {
  const message = composeMessage(delivery.status, delivery);
  if (!message) return { sent: false, reason: 'no notification for this status' };

  if (!AT_API_KEY) {
    console.warn('[notifications] AT_API_KEY not set — logging instead of sending:', message);
    return { sent: false, reason: 'no API key configured (dev mode)' };
  }

  try {
    const africastalking = require('africastalking')({ username: AT_USERNAME, apiKey: AT_API_KEY });
    const result = await africastalking.SMS.send({ to: [delivery.customerPhone], message });
    return { sent: true, result };
  } catch (err) {
    console.error('[notifications] SMS send failed:', err.message);
    return { sent: false, reason: err.message };
  }
}

module.exports = { composeMessage, sendStatusNotification };
