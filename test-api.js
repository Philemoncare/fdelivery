import http from 'http';

const data = JSON.stringify({
  email: `test_${Date.now()}@example.com`,
  password: 'Password123!',
  businessName: 'Test Restaurant',
  ownerName: 'Test Owner',
  role: 'vendor',
  businessAddress: 'Takoradi Mall',
  phone: '+233200000000',
  category: 'African'
});

const options = {
  hostname: '127.0.0.1',
  port: 3001,
  path: '/api/auth/register',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

console.log('--- STARTING API TEST ---');
console.log(`Payload size: ${(data.length / 1024).toFixed(2)} KB`);

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log('RESPONSE:', body);
    if (res.statusCode === 201) {
      console.log('✅ TEST PASSED: Registration successful.');
    } else {
      console.log('❌ TEST FAILED.');
    }
    process.exit(res.statusCode === 201 ? 0 : 1);
  });
});

req.on('error', (e) => {
  console.error(`❌ CONNECTION ERROR: ${e.message}`);
  process.exit(1);
});

req.write(data);
req.end();
