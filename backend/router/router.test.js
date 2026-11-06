import assert from 'assert';

const ROUTER_URL = process.env.ROUTER_URL || 'http://localhost:9000';

async function runRouterTestSuite() {
  console.log('\n======================================================');
  console.log(`🧪 Testing Central CDN Router at ${ROUTER_URL}`);
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

  // 1. GET /cdn/edges - Verify 4 edges and their initial configured simulated latency values
  await test('GET /cdn/edges returns 4 edge servers with correct configured latencies', async () => {
    const res = await fetch(`${ROUTER_URL}/cdn/edges`);
    assert.strictEqual(res.status, 200);
    const edges = await res.json();
    assert.strictEqual(edges.length, 4);

    const mumbai = edges.find(e => e.id === 'mumbai');
    const singapore = edges.find(e => e.id === 'singapore');
    const frankfurt = edges.find(e => e.id === 'frankfurt');
    const newyork = edges.find(e => e.id === 'newyork');

    assert.ok(mumbai, 'Missing Mumbai edge');
    assert.strictEqual(mumbai.simulatedLatencyMs, 35, 'Mumbai latency must be 35ms');
    assert.strictEqual(mumbai.port, 8001);

    assert.ok(singapore, 'Missing Singapore edge');
    assert.strictEqual(singapore.simulatedLatencyMs, 80, 'Singapore latency must be 80ms');
    assert.strictEqual(singapore.port, 8002);

    assert.ok(frankfurt, 'Missing Frankfurt edge');
    assert.strictEqual(frankfurt.simulatedLatencyMs, 150, 'Frankfurt latency must be 150ms');
    assert.strictEqual(frankfurt.port, 8003);

    assert.ok(newyork, 'Missing New York edge');
    assert.strictEqual(newyork.simulatedLatencyMs, 180, 'New York latency must be 180ms');
    assert.strictEqual(newyork.port, 8004);
  });

  // 2. GET /cdn/config
  await test('GET /cdn/config returns current routing strategy', async () => {
    const res = await fetch(`${ROUTER_URL}/cdn/config`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.strategy === 'ROUND_ROBIN' || data.strategy === 'LOWEST_LATENCY');
  });

  // 3. PUT /cdn/config - Set strategy to LOWEST_LATENCY
  await test('PUT /cdn/config changes strategy to LOWEST_LATENCY', async () => {
    const res = await fetch(`${ROUTER_URL}/cdn/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ strategy: 'LOWEST_LATENCY' })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.strategy, 'LOWEST_LATENCY');

    const check = await (await fetch(`${ROUTER_URL}/cdn/config`)).json();
    assert.strictEqual(check.strategy, 'LOWEST_LATENCY');
  });

  // 4. Test LOWEST_LATENCY algorithm: multiple requests route to Mumbai (lowest latency: 35ms)
  await test('LOWEST_LATENCY strategy routes multiple requests to Mumbai Edge (35ms)', async () => {
    for (let i = 0; i < 3; i++) {
      const res = await fetch(`${ROUTER_URL}/cdn/content/sample.txt`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.headers.get('x-selected-edge'), 'Mumbai Edge');
      assert.strictEqual(res.headers.get('x-edge-simulated-latency'), '35ms');
      assert.ok(res.headers.get('x-actual-request-duration'), 'Missing X-Actual-Request-Duration');
      assert.strictEqual(res.headers.get('x-routing-strategy'), 'LOWEST_LATENCY');
      assert.ok(res.headers.get('x-cache'));
    }
  });

  // 5. PUT /cdn/config - Set strategy to ROUND_ROBIN
  await test('PUT /cdn/config changes strategy to ROUND_ROBIN', async () => {
    const res = await fetch(`${ROUTER_URL}/cdn/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ strategy: 'ROUND_ROBIN' })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.strategy, 'ROUND_ROBIN');
  });

  // 6. Test ROUND_ROBIN algorithm: sequential requests distributed across healthy edges
  await test('ROUND_ROBIN strategy distributes requests sequentially across edges', async () => {
    const selectedEdges = [];
    for (let i = 0; i < 4; i++) {
      const res = await fetch(`${ROUTER_URL}/cdn/content/sample.txt`);
      assert.strictEqual(res.status, 200);
      const edge = res.headers.get('x-selected-edge');
      selectedEdges.push(edge);
    }

    console.log(`     Sequential routing order: ${selectedEdges.join(' -> ')}`);
    const unique = new Set(selectedEdges);
    assert.ok(unique.size >= 2, `Expected distribution across multiple edges, got ${unique.size}`);
  });

  // 7. Test PUT /cdn/config invalid strategy validation
  await test('PUT /cdn/config rejects invalid strategy with 400', async () => {
    const res = await fetch(`${ROUTER_URL}/cdn/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ strategy: 'INVALID_STRATEGY' })
    });
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.ok(data.error.includes('Invalid strategy'));
  });

  // 8. GET /cdn/decisions - Verify routing decision records
  await test('GET /cdn/decisions returns recorded routing decisions audit log', async () => {
    const res = await fetch(`${ROUTER_URL}/cdn/decisions`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.total > 0, `Expected recorded decisions > 0, got ${data.total}`);
    assert.ok(Array.isArray(data.decisions));

    const sample = data.decisions[0];
    assert.ok(sample.file);
    assert.ok(sample.strategy);
    assert.ok(sample.selectedEdge);
    assert.strictEqual(typeof sample.simulatedLatencyMs, 'number');
    assert.strictEqual(typeof sample.actualDurationMs, 'number');
  });

  // 9. EJS Diagnostic page GET / and GET /router
  await test('GET /router renders EJS diagnostic page with 200 OK', async () => {
    const res = await fetch(`${ROUTER_URL}/router`);
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes('Central CDN Router'));
    assert.ok(html.includes('Configured Edge Servers'));
  });

  // 10. Test 404 handling on missing file
  await test('GET /cdn/content/non-existent-file.bin returns 404 through edge', async () => {
    const res = await fetch(`${ROUTER_URL}/cdn/content/non-existent-file.bin`);
    assert.strictEqual(res.status, 404);
  });

  console.log('\n======================================================');
  console.log(`🏁 Router Test Results: ${passed} passed, ${failed} failed`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runRouterTestSuite().catch(err => {
  console.error('Router test error:', err);
  process.exit(1);
});
