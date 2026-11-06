import assert from 'assert';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createEdgeApp } from './edge/edgeServer.js';
import { createRouterApp } from './router/routerServer.js';
import { MetricsCollector } from './metrics/metricsCollector.js';
import { app as originApp } from './server.js';
import { runScenarioBenchmarks } from '../benchmarks/loadTest.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runComprehensiveVerification() {
  console.log('\n========================================================================');
  console.log('🚀 MINI CDN FINAL VERIFICATION TEST SUITE');
  console.log('========================================================================\n');

  const serversToClose = [];

  try {
    // -------------------------------------------------------------------------
    // Step 1: Start Origin Server (if not already running)
    // -------------------------------------------------------------------------
    let originPort = 8000;
    let originUrl = `http://127.0.0.1:${originPort}`;
    let originRunning = false;

    try {
      const res = await fetch(`${originUrl}/health`, { signal: AbortSignal.timeout(1000) });
      if (res.ok) originRunning = true;
    } catch {}

    if (!originRunning) {
      const s = await new Promise((resolve, reject) => {
        const srv = originApp.listen(0, () => resolve(srv));
        srv.on('error', reject);
      });
      originPort = s.address().port;
      originUrl = `http://127.0.0.1:${originPort}`;
      serversToClose.push(s);
      console.log(`[Origin] Started ephemeral origin test instance on ${originUrl}`);
    } else {
      console.log(`[Origin] Found running origin instance on ${originUrl}`);
    }

    // -------------------------------------------------------------------------
    // Step 2: Start All Four Edge Servers (Mumbai, Singapore, Frankfurt, New York)
    // -------------------------------------------------------------------------
    console.log('\n[Edge Verification] Starting four edge server instances...');
    const edgeConfigs = [
      { id: 'mumbai', name: 'Mumbai Edge', location: 'Mumbai, India', simulatedLatencyMs: 35 },
      { id: 'singapore', name: 'Singapore Edge', location: 'Singapore', simulatedLatencyMs: 80 },
      { id: 'frankfurt', name: 'Frankfurt Edge', location: 'Frankfurt, Germany', simulatedLatencyMs: 150 },
      { id: 'newyork', name: 'New York Edge', location: 'New York, USA', simulatedLatencyMs: 180 }
    ];

    const runningEdges = [];
    for (const ec of edgeConfigs) {
      const { app, cache, metrics } = createEdgeApp({
        ...ec,
        port: 0,
        originUrl
      });
      const srv = await new Promise(resolve => {
        const s = app.listen(0, () => resolve(s));
      });
      serversToClose.push(srv);
      const port = srv.address().port;
      const url = `http://127.0.0.1:${port}`;
      runningEdges.push({
        id: ec.id,
        name: ec.name,
        location: ec.location,
        simulatedLatencyMs: ec.simulatedLatencyMs,
        port,
        url,
        status: 'HEALTHY',
        cache,
        metrics
      });
      console.log(`  ✓ ${ec.name} (${ec.id}) listening on port ${port} (simulated latency: ${ec.simulatedLatencyMs}ms)`);
    }

    // Verify all four edges start and report healthy
    for (const edge of runningEdges) {
      const healthRes = await fetch(`${edge.url}/health`);
      assert.strictEqual(healthRes.status, 200, `${edge.name} health status should be 200`);
      const healthData = await healthRes.json();
      assert.strictEqual(healthData.status, 'healthy');
      assert.strictEqual(healthData.edgeId, edge.id);
    }
    console.log('✅ Criteria 1 Passed: All four edge servers started and responded with healthy status.');

    // -------------------------------------------------------------------------
    // Step 3: Origin Server Serves Content
    // -------------------------------------------------------------------------
    console.log('\n[Origin Content Verification] Checking origin content serving...');
    // Ensure test file exists in origin storage
    const storageDir = path.join(__dirname, 'origin', 'storage');
    if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true });
    const testFilename = 'test-file.txt';
    const testContent = 'Mini CDN Verification Content: ' + Date.now();
    fs.writeFileSync(path.join(storageDir, testFilename), testContent, 'utf8');

    const originContentRes = await fetch(`${originUrl}/origin/content/${testFilename}`);
    assert.strictEqual(originContentRes.status, 200, 'Origin should serve stored content with 200 OK');
    const receivedContent = await originContentRes.text();
    assert.strictEqual(receivedContent, testContent, 'Origin content must match file content');
    console.log('✅ Criteria 2 Passed: Origin server successfully serves stored content.');

    // -------------------------------------------------------------------------
    // Step 4: Router Initialization with Test Edges & Metrics
    // -------------------------------------------------------------------------
    console.log('\n[CDN Router Verification] Initializing router with edges and telemetry...');
    const collector = new MetricsCollector();
    const routerConfig = {
      port: 0,
      edges: runningEdges.map(e => ({
        id: e.id,
        name: e.name,
        location: e.location,
        port: e.port,
        url: e.url,
        simulatedLatencyMs: e.simulatedLatencyMs,
        status: 'HEALTHY',
        disabled: false,
        consecutiveFailures: 0,
        requestsRouted: 0,
        totalRequests: 0,
        cacheHitRatio: '0.0%'
      })),
      metricsCollector: collector
    };

    const { app: routerApp, close: closeRouter } = createRouterApp(routerConfig);
    const routerServer = await new Promise(resolve => {
      const s = routerApp.listen(0, () => resolve(s));
    });
    serversToClose.push(routerServer);
    const routerPort = routerServer.address().port;
    const routerUrl = `http://127.0.0.1:${routerPort}`;
    console.log(`  ✓ CDN Router running on ${routerUrl}`);

    // -------------------------------------------------------------------------
    // Step 5: First Request Produces Cache MISS, Subsequent Produces Cache HIT
    // -------------------------------------------------------------------------
    console.log('\n[Cache Behavior Verification] Testing Cache MISS followed by Cache HIT...');
    // Set routing to Round Robin or Lowest Latency
    await fetch(`${routerUrl}/cdn/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ strategy: 'LOWEST_LATENCY' })
    });

    // Request 1: Cache Miss
    const req1Res = await fetch(`${routerUrl}/cdn/content/${testFilename}`);
    assert.strictEqual(req1Res.status, 200);
    const xCache1 = req1Res.headers.get('x-cache');
    const xOrigin1 = req1Res.headers.get('x-origin-contacted');
    assert.strictEqual(xCache1, 'MISS', 'First request must produce Cache MISS');
    assert.ok(xOrigin1 === 'Yes' || xOrigin1 === 'true', 'Origin must be contacted on cache miss');
    console.log(`  ✓ Request 1: X-Cache: ${xCache1}, Origin Contacted: ${xOrigin1}`);

    // Request 2: Cache Hit
    const req2Res = await fetch(`${routerUrl}/cdn/content/${testFilename}`);
    assert.strictEqual(req2Res.status, 200);
    const xCache2 = req2Res.headers.get('x-cache');
    const xOrigin2 = req2Res.headers.get('x-origin-contacted');
    assert.strictEqual(xCache2, 'HIT', 'Subsequent request must produce Cache HIT');
    assert.ok(xOrigin2 === 'No' || xOrigin2 === 'false', 'Origin must NOT be contacted on cache hit');
    console.log(`  ✓ Request 2: X-Cache: ${xCache2}, Origin Contacted: ${xOrigin2}`);

    console.log('✅ Criteria 3 & 4 Passed: First request produces Cache MISS, subsequent request produces Cache HIT.');

    // -------------------------------------------------------------------------
    // Step 6: Both Routing Algorithms Work (Round Robin and Lowest Latency)
    // -------------------------------------------------------------------------
    console.log('\n[Routing Strategies Verification] Testing ROUND_ROBIN and LOWEST_LATENCY algorithms...');
    
    // Test 6a: LOWEST_LATENCY
    await fetch(`${routerUrl}/cdn/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ strategy: 'LOWEST_LATENCY' })
    });

    const lowestLatencyRes = await fetch(`${routerUrl}/cdn/content/${testFilename}`);
    const selectedLowestEdge = lowestLatencyRes.headers.get('x-selected-edge');
    // Mumbai has 35ms latency, which is lowest among 35, 80, 150, 180
    assert.ok(selectedLowestEdge.toLowerCase().includes('mumbai'), 'Lowest latency strategy should route to mumbai (35ms)');
    console.log(`  ✓ Lowest Latency correctly selected: ${selectedLowestEdge} (35ms)`);

    // Test 6b: ROUND_ROBIN
    await fetch(`${routerUrl}/cdn/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ strategy: 'ROUND_ROBIN' })
    });

    const rrEdgesChosen = [];
    for (let i = 0; i < 4; i++) {
      const rrRes = await fetch(`${routerUrl}/cdn/content/${testFilename}`);
      rrEdgesChosen.push(rrRes.headers.get('x-selected-edge'));
    }
    console.log(`  ✓ Round Robin cycle selected sequence: ${rrEdgesChosen.join(' -> ')}`);
    const uniqueChosen = new Set(rrEdgesChosen);
    assert.ok(uniqueChosen.size >= 3, 'Round Robin should distribute requests across distinct edges');
    console.log('✅ Criteria 5 Passed: Both ROUND_ROBIN and LOWEST_LATENCY algorithms route accurately.');

    // -------------------------------------------------------------------------
    // Step 7: Unhealthy Edges Excluded from Routing
    // -------------------------------------------------------------------------
    console.log('\n[Fault Tolerance Verification] Testing unhealthy edge exclusion...');
    // Set strategy to LOWEST_LATENCY where mumbai is preferred
    await fetch(`${routerUrl}/cdn/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ strategy: 'LOWEST_LATENCY' })
    });

    // Simulate failure on Mumbai edge
    const failRes = await fetch(`${routerUrl}/admin/edges/mumbai/failure`, { method: 'POST' });
    assert.strictEqual(failRes.status, 200);
    const failData = await failRes.json();
    assert.strictEqual(failData.status, 'OFFLINE');
    console.log('  ✓ Mumbai edge marked OFFLINE / failed');

    // Make request: should now route to Singapore (80ms), which is next lowest
    const fallbackRes = await fetch(`${routerUrl}/cdn/content/${testFilename}`);
    const fallbackEdge = fallbackRes.headers.get('x-selected-edge');
    assert.ok(fallbackEdge.toLowerCase().includes('singapore'), 'With Mumbai offline, next lowest latency edge (singapore) must be selected');
    console.log(`  ✓ Unhealthy Mumbai was excluded; successfully routed to next healthy edge: ${fallbackEdge}`);
    console.log('✅ Criteria 6 Passed: Unhealthy edges are strictly excluded from routing.');

    // -------------------------------------------------------------------------
    // Step 8: Failed Edges Can Recover
    // -------------------------------------------------------------------------
    console.log('\n[Recovery Verification] Testing edge recovery...');
    const recoverRes = await fetch(`${routerUrl}/admin/edges/mumbai/recover`, { method: 'POST' });
    assert.strictEqual(recoverRes.status, 200);
    const recoverData = await recoverRes.json();
    assert.strictEqual(recoverData.status, 'HEALTHY');
    console.log('  ✓ Mumbai edge recovered to HEALTHY');

    // Next request under LOWEST_LATENCY should route to Mumbai again
    const postRecoverRes = await fetch(`${routerUrl}/cdn/content/${testFilename}`);
    const recoveredEdge = postRecoverRes.headers.get('x-selected-edge');
    assert.ok(recoveredEdge.toLowerCase().includes('mumbai'), 'Recovered Mumbai edge should be re-included and selected');
    console.log(`  ✓ Recovered edge immediately restored into routing flow: ${recoveredEdge}`);
    console.log('✅ Criteria 7 Passed: Failed edges recover and are safely restored.');

    // -------------------------------------------------------------------------
    // Step 9: Cache Invalidation Works
    // -------------------------------------------------------------------------
    console.log('\n[Cache Invalidation Verification] Testing cache purge...');
    // Purge cache on Mumbai edge
    const purgeRes = await fetch(`${runningEdges[0].url}/cache`, { method: 'DELETE' });
    assert.strictEqual(purgeRes.status, 200);
    const purgeData = await purgeRes.json();
    assert.ok(purgeData.clearedCount !== undefined || purgeData.success);
    console.log(`  ✓ Mumbai edge cache purged`);

    // Next request to Mumbai should result in a Cache MISS
    const postPurgeRes = await fetch(`${routerUrl}/cdn/content/${testFilename}`);
    const postPurgeCache = postPurgeRes.headers.get('x-cache');
    assert.strictEqual(postPurgeCache, 'MISS', 'Request following cache invalidation must produce Cache MISS');
    console.log(`  ✓ Post-invalidation request resulted in: X-Cache: ${postPurgeCache}`);
    console.log('✅ Criteria 8 Passed: Cache invalidation successfully purges cached entries.');

    // -------------------------------------------------------------------------
    // Step 10: Metrics Reflect Actual Request Activity & Dashboard Backend Metrics
    // -------------------------------------------------------------------------
    console.log('\n[Metrics & Telemetry Verification] Checking telemetry recording and backend metrics...');
    const overviewRes = await fetch(`${routerUrl}/api/metrics/overview`);
    assert.strictEqual(overviewRes.status, 200);
    const overview = await overviewRes.json();
    assert.ok(overview.totalRequests > 0, 'Total requests must be > 0');
    assert.ok(overview.cacheHitRate !== undefined, 'Cache hit rate must be reported');
    assert.ok(overview.totalBandwidthBytes > 0, 'Total bandwidth must be > 0');
    console.log(`  ✓ Overview Metrics: Total Requests: ${overview.totalRequests}, Hit Rate: ${overview.cacheHitRate}, Bandwidth: ${overview.totalBandwidthFormatted}`);

    const edgesRes = await fetch(`${routerUrl}/api/metrics/edges`);
    assert.strictEqual(edgesRes.status, 200);
    const rawEdges = await edgesRes.json();
    const edgeList = Array.isArray(rawEdges) ? rawEdges : (rawEdges.edges || []);
    assert.strictEqual(edgeList.length, 4, 'Must report all 4 edges');
    console.log(`  ✓ Edges Telemetry: ${edgeList.map(e => `${e.name}: ${e.requestsHandled ?? e.requestsRouted ?? 0} reqs`).join(', ')}`);

    const requestsRes = await fetch(`${routerUrl}/api/metrics/requests?limit=5`);
    assert.strictEqual(requestsRes.status, 200);
    const rawRequests = await requestsRes.json();
    const reqList = Array.isArray(rawRequests) ? rawRequests : (rawRequests.requests || []);
    assert.ok(reqList.length > 0, 'Recent requests log must not be empty');
    console.log(`  ✓ Requests Log: Recorded ${reqList.length} recent requests`);

    const cacheRes = await fetch(`${routerUrl}/api/metrics/cache`);
    assert.strictEqual(cacheRes.status, 200);
    const cacheMetrics = await cacheRes.json();
    assert.ok(cacheMetrics.totalHits !== undefined);
    assert.ok(cacheMetrics.totalMisses !== undefined);
    console.log(`  ✓ Cache Metrics: Hits: ${cacheMetrics.totalHits}, Misses: ${cacheMetrics.totalMisses}`);

    console.log('✅ Criteria 9 & 10 Passed: Metrics accurately capture all request telemetry for Dashboard display.');

    // -------------------------------------------------------------------------
    // Step 11: Performance Benchmarking Works
    // -------------------------------------------------------------------------
    console.log('\n[Performance Benchmarking Verification] Running Autocannon benchmark comparison...');
    const benchmarkResult = await runScenarioBenchmarks({ 
      duration: 1, 
      connections: 3, 
      filename: testFilename,
      originUrl,
      routerUrl
    });
    assert.ok(benchmarkResult.scenarios.length === 3, 'Must compare all 3 performance scenarios');
    assert.strictEqual(benchmarkResult.scenarios[0].name, 'Direct Origin Request');
    assert.strictEqual(benchmarkResult.scenarios[1].name, 'CDN Request (Cache Disabled)');
    assert.strictEqual(benchmarkResult.scenarios[2].name, 'CDN Request (Cache Enabled)');
    assert.ok(benchmarkResult.scenarios[2].requestsPerSecond > 0, 'Edge cache req/sec must be > 0');
    assert.ok(benchmarkResult.comparison.speedupVsOrigin, 'Comparison speedup must be computed');
    console.log(`  ✓ Benchmark: Direct Origin ${benchmarkResult.scenarios[0].averageLatencyMs}ms vs Edge Cache ${benchmarkResult.scenarios[2].averageLatencyMs}ms`);
    console.log(`  ✓ CDN Cache Speedup: ${benchmarkResult.comparison.speedupVsOrigin}`);
    console.log('✅ Criteria 11 Passed: Autocannon multi-scenario benchmarking works and generates comparative analytics.');

    console.log('\n========================================================================');
    console.log('🎉 ALL 11 FINAL VERIFICATION TESTS PASSED SUCCESSFULLY!');
    console.log('========================================================================\n');
  } finally {
    for (const s of serversToClose) {
      try { s.close(); } catch {}
    }
  }
}

runComprehensiveVerification().catch(err => {
  console.error('\n❌ Verification failed with error:', err);
  process.exit(1);
});
