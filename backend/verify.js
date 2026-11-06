import assert from 'assert';

async function verifyBackend() {
  console.log('Testing backend server health and origin diagnostic page...');
  const res = await fetch('http://localhost:8000/health');
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.status, 'healthy');
  assert.strictEqual(data.service, 'mini-cdn-backend');

  const pageRes = await fetch('http://localhost:8000/origin');
  assert.strictEqual(pageRes.status, 200);
  const html = await pageRes.text();
  assert.ok(html.includes('Origin Server Status') || html.includes('Origin Storage Server'));
  console.log('✅ Backend health and Origin EJS verification successful!');
}

verifyBackend().catch(err => {
  console.error('Backend verification failed:', err);
  process.exit(1);
});
