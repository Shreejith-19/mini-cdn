import assert from 'assert';
import http from 'http';
import express from 'express';
import { createEdgeApp } from './edge/edgeServer.js';
import { createRouterApp } from './router/routerServer.js';
import { MetricsCollector } from './metrics/metricsCollector.js';

async function runSimulatorBackendTests() {
  console.log('\n======================================================');
  console.log('🧪 Testing Request Simulator Backend Routing & Telemetry');
  console.log('======================================================\n');

  // 1. Start mock Origin Server on ephemeral port
  const originApp = express();
  let originHitCount = 0;
  originApp.get('/origin/content/:filename', (req, res) => {
    originHitCount++;
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('ETag', '"test-etag-123"');
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.status(200).send(`Hello world from mock origin: ${req.params.filename}`);
  });

  const originServer = await new Promise(resolve => {
    const s = originApp.listen(0, () => resolve(s));
  });
  const originPort = originServer.address().port;
  const originUrl = `http://127.0.0.1:${originPort}`;
  console.log(`[Test] Mock Origin running on ${originUrl}`);

  // 2. Start two Edge Servers on ephemeral ports
  const { app: edge1App } = createEdgeApp({
    id: 'mumbai',
    name: 'Mumbai Edge',
    port: 0,
    originUrl,
    simulatedLatencyMs: 35
  });
  const edge1Server = await new Promise(resolve => {
    const s = edge1App.listen(0, () => resolve(s));
  });
  const edge1Port = edge1Server.address().port;

  const { app: edge2App } = createEdgeApp({
    id: 'singapore',
    name: 'Singapore Edge',
    port: 0,
    originUrl,
    simulatedLatencyMs: 80
  });
  const edge2Server = await new Promise(resolve => {
    const s = edge2App.listen(0, () => resolve(s));
  });
  const edge2Port = edge2Server.address().port;

  console.log(`[Test] Mumbai Edge running on :${edge1Port}, Singapore Edge on :${edge2Port}`);

  // 3. Start Router with test edges and collector
  const collector = new MetricsCollector();
  const { app: routerApp, close: closeRouter } = createRouterApp({
    metricsCollector: collector,
    edges: [
      {
        id: 'mumbai',
        name: 'Mumbai Edge',
        location: 'Mumbai, India',
        port: edge1Port,
        url: `http://127.0.0.1:${edge1Port}`,
        simulatedLatencyMs: 35,
        status: 'HEALTHY',
        disabled: false,
        consecutiveFailures: 0,
        requestsRouted: 0,
        totalRequests: 0,
        cacheHitRatio: '0.0%'
      },
      {
        id: 'singapore',
        name: 'Singapore Edge',
        location: 'Singapore',
        port: edge2Port,
        url: `http://127.0.0.1:${edge2Port}`,
        simulatedLatencyMs: 80,
        status: 'HEALTHY',
        disabled: false,
        consecutiveFailures: 0,
        requestsRouted: 0,
        totalRequests: 0,
        cacheHitRatio: '0.0%'
      }
    ]
  });

  const routerServer = await new Promise(resolve => {
    const s = routerApp.listen(0, () => resolve(s));
  });
  const routerPort = routerServer.address().port;
  const routerUrl = `http://127.0.0.1:${routerPort}`;
  console.log(`[Test] CDN Router running on ${routerUrl}\n`);

  try {
    // TEST 1: Request with strategy=LOWEST_LATENCY -> Must route to Mumbai Edge (35ms)
    console.log('1. Testing Lowest Latency routing (First request -> Cold Cache MISS):');
    const res1 = await fetch(`${routerUrl}/cdn/content/sample.txt?strategy=LOWEST_LATENCY`);
    assert.strictEqual(res1.status, 200);
    assert.strictEqual(res1.headers.get('x-selected-edge'), 'Mumbai Edge');
    assert.strictEqual(res1.headers.get('x-routing-strategy'), 'LOWEST_LATENCY');
    assert.strictEqual(res1.headers.get('x-cache'), 'MISS');
    assert.strictEqual(res1.headers.get('x-origin-contacted'), 'Yes');
    assert.ok(res1.headers.get('x-request-id'), 'Missing X-Request-Id header');
    assert.strictEqual(originHitCount, 1, 'Origin server should have been contacted on Cache MISS');
    console.log('  ✓ Cache MISS verified with Origin Contacted: Yes and X-Request-Id');

    // TEST 2: Second consecutive request to the same file with LOWEST_LATENCY -> Warm Cache HIT!
    console.log('2. Testing consecutive request to same file (Second request -> Warm Cache HIT):');
    const res2 = await fetch(`${routerUrl}/cdn/content/sample.txt?strategy=LOWEST_LATENCY`);
    assert.strictEqual(res2.status, 200);
    assert.strictEqual(res2.headers.get('x-selected-edge'), 'Mumbai Edge');
    assert.strictEqual(res2.headers.get('x-cache'), 'HIT');
    assert.strictEqual(res2.headers.get('x-origin-contacted'), 'No');
    assert.strictEqual(originHitCount, 1, 'Origin server must NOT be contacted on Cache HIT');
    console.log('  ✓ Cache HIT verified with Origin Contacted: No and 0 origin requests');

    // TEST 3: Third consecutive request -> Another Cache HIT!
    console.log('3. Testing third consecutive request -> Cache HIT preserved:');
    const res3 = await fetch(`${routerUrl}/cdn/content/sample.txt?strategy=LOWEST_LATENCY`);
    assert.strictEqual(res3.status, 200);
    assert.strictEqual(res3.headers.get('x-cache'), 'HIT');
    assert.strictEqual(res3.headers.get('x-origin-contacted'), 'No');
    assert.strictEqual(originHitCount, 1, 'Origin count remains 1');
    console.log('  ✓ Multiple sequential requests successfully demonstrate Cache HIT');

    // TEST 4: Round Robin routing option
    console.log('4. Testing Round Robin routing algorithm option:');
    const res4 = await fetch(`${routerUrl}/cdn/content/sample.txt?strategy=ROUND_ROBIN`);
    assert.strictEqual(res4.status, 200);
    assert.strictEqual(res4.headers.get('x-routing-strategy'), 'ROUND_ROBIN');
    console.log(`  ✓ Routed via ROUND_ROBIN to ${res4.headers.get('x-selected-edge')}`);

    // TEST 5: Verify CORS exposed headers
    console.log('5. Testing CORS Access-Control-Expose-Headers for browser client:');
    const exposedHeaders = res1.headers.get('access-control-expose-headers') || '';
    assert.ok(
      exposedHeaders.includes('X-Request-Id') &&
      exposedHeaders.includes('X-Selected-Edge') &&
      exposedHeaders.includes('X-Cache') &&
      exposedHeaders.includes('X-Origin-Contacted'),
      `Exposed headers must include custom CDN metadata headers: ${exposedHeaders}`
    );
    console.log('  ✓ CORS headers properly exposed for browser JavaScript');

    console.log('\n======================================================');
    console.log('🎉 All Request Simulator backend tests passed cleanly!');
    console.log('======================================================\n');
  } finally {
    // Teardown ephemeral servers
    closeRouter();
    routerServer.close();
    edge1Server.close();
    edge2Server.close();
    originServer.close();
  }
}

runSimulatorBackendTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
