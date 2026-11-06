import assert from 'assert';

const ORIGIN_URL = process.env.ORIGIN_URL || 'http://localhost:8000';
const EDGES = [
  { name: 'Mumbai Edge', port: 8001, url: 'http://localhost:8001' },
  { name: 'Singapore Edge', port: 8002, url: 'http://localhost:8002' },
  { name: 'Frankfurt Edge', port: 8003, url: 'http://localhost:8003' },
  { name: 'New York Edge', port: 8004, url: 'http://localhost:8004' }
];

async function runEdgeTestSuite() {
  console.log('\n======================================================');
  console.log('🧪 Testing 4 Independent Edge Server Instances');
  console.log('======================================================\n');

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

  // 1. Verify GET /health on all 4 independent edge servers
  for (const edge of EDGES) {
    await test(`GET /health on ${edge.name} (Port :${edge.port}) returns health, name, and uptime`, async () => {
      const res = await fetch(`${edge.url}/health`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.status, 'healthy');
      assert.strictEqual(data.edgeName, edge.name);
      assert.strictEqual(typeof data.uptime, 'number');
    });
  }

  // Clear caches on all edges to ensure clean starting state
  for (const edge of EDGES) {
    await fetch(`${edge.url}/cache`, { method: 'DELETE' });
  }

  // 2. Test GET /content/:filename (CACHE MISS on 1st request)
  await test('GET /content/sample.txt on Mumbai Edge (1st request) returns CACHE MISS and fetches from Origin', async () => {
    const res = await fetch('http://localhost:8001/content/sample.txt');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('x-cache'), 'MISS');
    assert.strictEqual(res.headers.get('x-cache-edge'), 'Mumbai Edge');
    assert.ok(res.headers.get('content-type'));
    assert.ok(res.headers.get('etag'));
    assert.ok(res.headers.get('cache-control'));
    const text = await res.text();
    assert.ok(text.includes('Hello from Mini CDN Origin Server'));
  });

  // 3. Test GET /content/:filename (CACHE HIT on 2nd request)
  await test('GET /content/sample.txt on Mumbai Edge (2nd request) returns CACHE HIT without contacting origin', async () => {
    const res = await fetch('http://localhost:8001/content/sample.txt');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('x-cache'), 'HIT');
    assert.strictEqual(res.headers.get('x-cache-edge'), 'Mumbai Edge');
    const text = await res.text();
    assert.ok(text.includes('Hello from Mini CDN Origin Server'));
  });

  // 4. Test Independence: Singapore Edge still has CACHE MISS for sample.txt
  await test('GET /content/sample.txt on Singapore Edge returns CACHE MISS (verifying independent cache)', async () => {
    const res = await fetch('http://localhost:8002/content/sample.txt');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('x-cache'), 'MISS');
    assert.strictEqual(res.headers.get('x-cache-edge'), 'Singapore Edge');
  });

  // 5. Test GET /stats on Mumbai Edge
  await test('GET /stats on Mumbai Edge returns all 6 required metrics', async () => {
    const res = await fetch('http://localhost:8001/stats');
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.edgeName, 'Mumbai Edge');
    assert.strictEqual(typeof data.totalRequests, 'number');
    assert.ok(data.totalRequests >= 2, `Expected >= 2 requests, got ${data.totalRequests}`);
    assert.strictEqual(typeof data.cacheHits, 'number');
    assert.ok(data.cacheHits >= 1, `Expected >= 1 hits, got ${data.cacheHits}`);
    assert.strictEqual(typeof data.cacheMisses, 'number');
    assert.ok(data.cacheMisses >= 1, `Expected >= 1 misses, got ${data.cacheMisses}`);
    assert.ok(data.cacheHitRatio, 'Missing cacheHitRatio');
    assert.strictEqual(typeof data.cachedObjectCount, 'number');
    assert.strictEqual(data.cachedObjectCount, 1);
    assert.strictEqual(typeof data.bytesServed, 'number');
    assert.ok(data.bytesServed > 0, 'Expected bytesServed > 0');
  });

  // 6. Test GET /cache (returns cached object metadata)
  await test('GET /cache on Mumbai Edge returns cached object metadata', async () => {
    const res = await fetch('http://localhost:8001/cache');
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.count, 1);
    assert.ok(Array.isArray(data.objects));
    assert.strictEqual(data.objects[0].key, '/origin/content/sample.txt');
    assert.ok(data.objects[0].size > 0);
    assert.ok(data.objects[0].cachedAt);
  });

  // 7. Test DELETE /cache (clears the edge cache)
  await test('DELETE /cache on Mumbai Edge clears the cache and resets count', async () => {
    const res = await fetch('http://localhost:8001/cache', { method: 'DELETE' });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.message, 'Edge cache cleared successfully');

    // Confirm cache is now empty
    const checkRes = await fetch('http://localhost:8001/cache');
    const checkData = await checkRes.json();
    assert.strictEqual(checkData.count, 0);

    // Subsequent request must be a MISS again
    const missRes = await fetch('http://localhost:8001/content/sample.txt');
    assert.strictEqual(missRes.status, 200);
    assert.strictEqual(missRes.headers.get('x-cache'), 'MISS');
  });

  // 8. Test Cache Independence: Singapore cache was NOT affected by Mumbai delete
  await test('Singapore Edge cache remained intact after Mumbai cache was cleared', async () => {
    const res = await fetch('http://localhost:8002/cache');
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.count, 1, 'Singapore cache should still have 1 object');
  });

  // 9. Test GET / (EJS Diagnostic Page) displays all 6 required fields
  for (const edge of EDGES) {
    await test(`GET / on ${edge.name} (Port :${edge.port}) displays all 6 required diagnostic fields`, async () => {
      const res = await fetch(`${edge.url}/`);
      assert.strictEqual(res.status, 200);
      assert.ok(res.headers.get('content-type').includes('text/html'));
      const html = await res.text();

      // Check the 6 required items:
      assert.ok(html.includes('Edge Location'), 'Missing Edge Location');
      assert.ok(html.includes('Server Status'), 'Missing Server Status');
      assert.ok(html.includes('Cache Object Count'), 'Missing Cache Object Count');
      assert.ok(html.includes('Cache Hits'), 'Missing Cache Hits');
      assert.ok(html.includes('Cache Misses'), 'Missing Cache Misses');
      assert.ok(html.includes('Cache Hit Ratio'), 'Missing Cache Hit Ratio');
    });
  }

  // 10. Test 404 on missing file
  await test('GET /content/non-existent-file.xyz returns 404 from origin', async () => {
    const res = await fetch('http://localhost:8001/content/non-existent-file.xyz');
    assert.strictEqual(res.status, 404);
  });

  console.log('\n======================================================');
  console.log(`🏁 Edge Server Test Results: ${passed} passed, ${failed} failed`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runEdgeTestSuite().catch(err => {
  console.error('Edge test suite error:', err);
  process.exit(1);
});
