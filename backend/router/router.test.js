import assert from 'assert';

const ROUTER_URL = process.env.ROUTER_URL || 'http://localhost:9000';

async function runRouterTestSuite() {
  console.log('\n======================================================');
  console.log(`🧪 Testing CDN Router Health Monitoring & Failover`);
  console.log(`   Router endpoint: ${ROUTER_URL}`);
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

  // Ensure all edges start online and healthy
  for (const id of ['mumbai', 'singapore', 'frankfurt', 'newyork']) {
    await fetch(`${ROUTER_URL}/admin/edges/${id}/recover`, { method: 'POST' });
  }

  // 1. GET /cdn/edges - Verify Dashboard Data fields
  await test('GET /cdn/edges exposes all required dashboard data fields', async () => {
    const res = await fetch(`${ROUTER_URL}/cdn/edges`);
    assert.strictEqual(res.status, 200);
    const edges = await res.json();
    assert.strictEqual(edges.length, 4);

    for (const edge of edges) {
      assert.ok(edge.name, 'Missing Edge name');
      assert.ok(edge.location, 'Missing Location');
      assert.ok(edge.status, 'Missing Health status');
      assert.ok(edge.configuredLatency, 'Missing Configured latency');
      assert.strictEqual(typeof edge.simulatedLatencyMs, 'number');
      assert.strictEqual(typeof edge.totalRequests, 'number');
      assert.ok(edge.cacheHitRatio !== undefined, 'Missing Cache hit ratio');
    }
  });

  // 2. Normal lowest latency routing routes to Mumbai (35ms)
  await test('LOWEST_LATENCY routing routes to Mumbai Edge (35ms) when all edges are healthy', async () => {
    await fetch(`${ROUTER_URL}/cdn/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ strategy: 'LOWEST_LATENCY' })
    });

    const res = await fetch(`${ROUTER_URL}/cdn/content/sample.txt`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('x-selected-edge'), 'Mumbai Edge');
    assert.strictEqual(res.headers.get('x-edge-simulated-latency'), '35ms');
  });

  // 3. Test Failure Simulation: POST /admin/edges/:id/failure
  await test('POST /admin/edges/mumbai/failure marks Mumbai offline for failure testing', async () => {
    const res = await fetch(`${ROUTER_URL}/admin/edges/mumbai/failure`, { method: 'POST' });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.edge.disabled, true);
    assert.ok(data.edge.status.includes('UNHEALTHY'));

    // Verify in /cdn/edges
    const edges = await (await fetch(`${ROUTER_URL}/cdn/edges`)).json();
    const mumbai = edges.find(e => e.id === 'mumbai');
    assert.strictEqual(mumbai.disabled, true);
  });

  // 4. Test Failover under LOWEST_LATENCY: Requests redirect to remaining lowest latency edge (Singapore 80ms)
  await test('Failover (LOWEST_LATENCY): With Mumbai offline, requests redirect to Singapore (80ms)', async () => {
    for (let i = 0; i < 3; i++) {
      const res = await fetch(`${ROUTER_URL}/cdn/content/sample.txt`);
      assert.strictEqual(res.status, 200);
      const selected = res.headers.get('x-selected-edge');
      assert.strictEqual(selected, 'Singapore Edge', 'Expected failover to Singapore Edge (next lowest latency)');
      assert.strictEqual(res.headers.get('x-edge-simulated-latency'), '80ms');
    }
  });

  // 5. Test Failover under ROUND_ROBIN: Requests distribute ONLY across remaining 3 edges
  await test('Failover (ROUND_ROBIN): Requests distribute ONLY across remaining 3 edges (never Mumbai)', async () => {
    await fetch(`${ROUTER_URL}/cdn/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ strategy: 'ROUND_ROBIN' })
    });

    const selected = [];
    for (let i = 0; i < 6; i++) {
      const res = await fetch(`${ROUTER_URL}/cdn/content/sample.txt`);
      assert.strictEqual(res.status, 200);
      selected.push(res.headers.get('x-selected-edge'));
    }

    console.log(`     Edges selected during Mumbai failure: ${selected.join(', ')}`);
    assert.ok(!selected.includes('Mumbai Edge'), 'Unhealthy Mumbai Edge must NOT receive any requests');
    const unique = new Set(selected);
    assert.ok(unique.has('Singapore Edge'));
    assert.ok(unique.has('Frankfurt Edge'));
    assert.ok(unique.has('New York Edge'));
  });

  // 6. Test Recovery Simulation: POST /admin/edges/:id/recover
  await test('POST /admin/edges/mumbai/recover restores Mumbai and automatically resumes routing', async () => {
    const res = await fetch(`${ROUTER_URL}/admin/edges/mumbai/recover`, { method: 'POST' });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.edge.disabled, false);
    assert.strictEqual(data.edge.status, 'HEALTHY');

    // Switch back to LOWEST_LATENCY to confirm Mumbai is selected again
    await fetch(`${ROUTER_URL}/cdn/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ strategy: 'LOWEST_LATENCY' })
    });

    const routeRes = await fetch(`${ROUTER_URL}/cdn/content/sample.txt`);
    assert.strictEqual(routeRes.status, 200);
    assert.strictEqual(routeRes.headers.get('x-selected-edge'), 'Mumbai Edge');
  });

  // 7. Test Meaningful Error when ALL edges are unavailable
  await test('Returns meaningful 503 error when all 4 edges are unavailable', async () => {
    // Disable all 4 edges
    for (const id of ['mumbai', 'singapore', 'frankfurt', 'newyork']) {
      await fetch(`${ROUTER_URL}/admin/edges/${id}/failure`, { method: 'POST' });
    }

    const res = await fetch(`${ROUTER_URL}/cdn/content/sample.txt`);
    assert.strictEqual(res.status, 503);
    const data = await res.json();
    assert.ok(data.error.includes('All edge servers are currently unavailable'));

    // Recover all edges
    for (const id of ['mumbai', 'singapore', 'frankfurt', 'newyork']) {
      await fetch(`${ROUTER_URL}/admin/edges/${id}/recover`, { method: 'POST' });
    }
  });

  // 8. EJS Diagnostic page
  await test('GET /router diagnostic page renders with health monitoring info', async () => {
    const res = await fetch(`${ROUTER_URL}/router`);
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes('Central CDN Router'));
    assert.ok(html.includes('Healthy Edge PoPs'));
    assert.ok(html.includes('Failure Simulator'));
  });

  console.log('\n======================================================');
  console.log(`🏁 Router Health & Failover Results: ${passed} passed, ${failed} failed`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runRouterTestSuite().catch(err => {
  console.error('Router test error:', err);
  process.exit(1);
});
