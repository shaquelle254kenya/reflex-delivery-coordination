const assert = require('assert');
const { composeMessage, sendStatusNotification } = require('./notifications');

const sampleDelivery = {
  itemDescription: 'HDMI cable',
  address: 'Ngong Road, Nairobi',
  customerPhone: '0700123456',
};

console.log('--- Testing composeMessage (pure logic, no network) ---');

const assignedMsg = composeMessage('assigned', sampleDelivery);
assert(assignedMsg.includes('assigned'), 'assigned message should mention assignment');
console.log('assigned:', assignedMsg);

const pickedUpMsg = composeMessage('picked_up', sampleDelivery);
assert(pickedUpMsg.includes('picked up'), 'picked_up message should mention pickup');
assert(pickedUpMsg.includes(sampleDelivery.address), 'picked_up message should include the address');
console.log('picked_up:', pickedUpMsg);

const deliveredMsg = composeMessage('delivered', sampleDelivery);
assert(deliveredMsg.includes('delivered'), 'delivered message should mention delivery');
console.log('delivered:', deliveredMsg);

const requestedMsg = composeMessage('requested', sampleDelivery);
assert(requestedMsg === null, 'requested status should produce no message');
console.log('requested: (correctly no message)');

console.log('\nAll composeMessage checks passed.');

console.log('\n--- Testing sendStatusNotification without API key (dev-mode fallback) ---');
sendStatusNotification({ ...sampleDelivery, status: 'delivered' }).then((result) => {
  assert(result.sent === false, 'should not claim success with no API key configured');
  console.log('Correctly reported not sent:', result.reason);
  console.log('\nAll checks passed.');
});
