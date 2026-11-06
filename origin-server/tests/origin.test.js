import assert from 'assert';

const ORIGIN_URL = process.env.ORIGIN_URL || 'http://localhost:8000';

async function runTests() {
  console.log(`\n🧪 Testing Origin Server at ${ORIGIN_URL}...\n`);

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✅ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ ${name}: ${err.message}`);
      failed++;
    }
  }

  // Test 1: Health check
  await test('GET /health returns healthy status', async () => {
    const res = await fetch(`${ORIGIN_URL}/health`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.status, 'healthy');
    assert.strictEqual(data.role, 'origin');
  });

  // Test 2: Diagnostics page
  await test('GET /diagnostics renders EJS page with 200 OK', async () => {
    const res = await fetch(`${ORIGIN_URL}/diagnostics`);
    assert.strictEqual(res.status, 200);
    const text = await res.text();
    assert.ok(text.includes('Origin Storage Server'), 'Should include title');
    assert.ok(text.includes('Authoritative Asset Catalog'), 'Should include catalog section');
  });

  // Test 3: Asset Catalog API
  await test('GET /api/assets returns file list', async () => {
    const res = await fetch(`${ORIGIN_URL}/api/assets`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.total >= 4, `Expected at least 4 assets, got ${data.total}`);
    const filenames = data.assets.map(a => a.filename);
    assert.ok(filenames.includes('dataset.json'), 'Missing dataset.json');
    assert.ok(filenames.includes('banner.svg'), 'Missing banner.svg');
  });

  // Test 4: Content delivery with headers
  await test('GET /assets/dataset.json returns valid content with CDN origin headers', async () => {
    const res = await fetch(`${ORIGIN_URL}/assets/dataset.json`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('content-type'), 'application/json; charset=utf-8');
    assert.ok(res.headers.get('etag'), 'Missing ETag header');
    assert.ok(res.headers.get('cache-control'), 'Missing Cache-Control header');
    assert.ok(res.headers.get('x-origin-server'), 'Missing X-Origin-Server header');
    const json = await res.json();
    assert.strictEqual(json.project, 'Mini CDN Simulator');
  });

  // Test 5: Status API metrics tracking
  await test('GET /api/status reports tracked request counts', async () => {
    const res = await fetch(`${ORIGIN_URL}/api/status`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.totalRequests > 0, 'Total requests should be > 0');
    assert.ok(data.bytesTransferred > 0, 'Bytes transferred should be > 0');
  });

  // Test 6: Dynamic config adjustment
  await test('POST /api/config modifies simulatedLatencyMs', async () => {
    const res = await fetch(`${ORIGIN_URL}/api/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ simulatedLatencyMs: 75 })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.simulatedLatencyMs, 75);

    // Reset back to 150
    await fetch(`${ORIGIN_URL}/api/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ simulatedLatencyMs: 150 })
    });
  });

  // Test 7: 404 for unknown asset
  await test('GET /assets/non-existent.xyz returns 404', async () => {
    const res = await fetch(`${ORIGIN_URL}/assets/non-existent.xyz`);
    assert.strictEqual(res.status, 404);
  });

  console.log(`\nOrigin Server Tests Finished: ${passed} passed, ${failed} failed.\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});

