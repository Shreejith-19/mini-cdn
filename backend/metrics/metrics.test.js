import assert from 'assert';
import http from 'http';
import express from 'express';
import { MetricsCollector } from './metricsCollector.js';
import { createMetricsRouter } from './metricsRouter.js';

let totalTests = 0;
let passedTests = 0;

async function test(name, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    throw err;
  }
}

async function runTests() {
  console.log('\n--- Running Mini CDN Metrics Collection Module Tests ---\n');

  // ==========================================
  // Section 1: In-Memory MetricsCollector Unit Tests
  // ==========================================
  console.log('1. MetricsCollector Core Unit Tests:');

  await test('Collector initializes with zero counters and 4 configured edges', () => {
    const collector = new MetricsCollector();
    const overview = collector.getOverview();
    const edges = collector.getEdges();

    assert.strictEqual(overview.totalRequests, 0);
    assert.strictEqual(overview.totalCacheHits, 0);
    assert.strictEqual(overview.totalCacheMisses, 0);
    assert.strictEqual(overview.overallCacheHitRatio, 0.0);
    assert.strictEqual(overview.totalOriginRequests, 0);
    assert.strictEqual(overview.totalBytesServed, 0);
    assert.strictEqual(overview.failedRequests, 0);
    assert.strictEqual(overview.averageResponseLatency, 0.0);
    assert.strictEqual(edges.length, 4);

    const edgeNames = edges.map(e => e.id);
    assert.ok(edgeNames.includes('mumbai'));
    assert.ok(edgeNames.includes('singapore'));
    assert.ok(edgeNames.includes('frankfurt'));
    assert.ok(edgeNames.includes('newyork'));
  });

  await test('Recording Cache HIT updates global and per-edge hits without origin requests', () => {
    const collector = new MetricsCollector();

    const record = collector.recordRequest({
      filename: 'sample.txt',
      edgeId: 'mumbai',
      cacheStatus: 'HIT',
      latencyMs: 14,
      statusCode: 200,
      bytes: 1024
    });

    assert.ok(record.requestId, 'Missing requestId');
    assert.strictEqual(record.cacheStatus, 'HIT');
    assert.strictEqual(record.responseLatency, 14);

    const overview = collector.getOverview();
    assert.strictEqual(overview.totalRequests, 1);
    assert.strictEqual(overview.totalCacheHits, 1);
    assert.strictEqual(overview.totalCacheMisses, 0);
    assert.strictEqual(overview.overallCacheHitRatio, 100.0);
    assert.strictEqual(overview.totalOriginRequests, 0, 'Cache HIT must NOT increment origin requests');
    assert.strictEqual(overview.totalBytesServed, 1024);
    assert.strictEqual(overview.failedRequests, 0);
    assert.strictEqual(overview.averageResponseLatency, 14.0);

    const edges = collector.getEdges();
    const mumbai = edges.find(e => e.id === 'mumbai');
    assert.strictEqual(mumbai.requestsHandled, 1);
    assert.strictEqual(mumbai.cacheHits, 1);
    assert.strictEqual(mumbai.cacheMisses, 0);
    assert.strictEqual(mumbai.cacheHitRatio, 100.0);
    assert.strictEqual(mumbai.bytesServed, 1024);
  });

  await test('Recording Cache MISS correctly counts origin requests and updates hit ratio', () => {
    const collector = new MetricsCollector();

    // 1st request: MISS on Singapore
    collector.recordRequest({
      filename: 'banner.svg',
      edgeId: 'singapore',
      cacheStatus: 'MISS',
      latencyMs: 82,
      statusCode: 200,
      bytes: 2048
    });

    // 2nd request: HIT on Singapore
    collector.recordRequest({
      filename: 'banner.svg',
      edgeId: 'singapore',
      cacheStatus: 'HIT',
      latencyMs: 12,
      statusCode: 200,
      bytes: 2048
    });

    const overview = collector.getOverview();
    assert.strictEqual(overview.totalRequests, 2);
    assert.strictEqual(overview.totalCacheHits, 1);
    assert.strictEqual(overview.totalCacheMisses, 1);
    assert.strictEqual(overview.totalOriginRequests, 1, 'Cache MISS must increment totalOriginRequests');
    assert.strictEqual(overview.overallCacheHitRatio, 50.0);
    assert.strictEqual(overview.totalBytesServed, 4096);
    assert.strictEqual(overview.averageResponseLatency, 47.0); // (82 + 12) / 2 = 47ms

    const singapore = collector.getEdges().find(e => e.id === 'singapore');
    assert.strictEqual(singapore.requestsHandled, 2);
    assert.strictEqual(singapore.cacheHits, 1);
    assert.strictEqual(singapore.cacheMisses, 1);
    assert.strictEqual(singapore.cacheHitRatio, 50.0);
    assert.strictEqual(singapore.bytesServed, 4096);
  });

  await test('Failed requests (4xx/5xx) are tracked accurately', () => {
    const collector = new MetricsCollector();

    collector.recordRequest({
      filename: 'missing.txt',
      edgeId: 'frankfurt',
      cacheStatus: 'ERROR',
      latencyMs: 25,
      statusCode: 404,
      bytes: 150
    });

    collector.recordRequest({
      filename: 'timeout.txt',
      edgeId: 'newyork',
      cacheStatus: 'ERROR',
      latencyMs: 5000,
      statusCode: 504,
      bytes: 0
    });

    const overview = collector.getOverview();
    assert.strictEqual(overview.totalRequests, 2);
    assert.strictEqual(overview.failedRequests, 2);
  });

  await test('Bounded in-memory request history prevents memory growth and contains all 7 required fields', () => {
    const collector = new MetricsCollector({ maxHistory: 10 });

    for (let i = 1; i <= 25; i++) {
      collector.recordRequest({
        filename: `file-${i}.txt`,
        edgeId: 'mumbai',
        cacheStatus: i % 2 === 0 ? 'HIT' : 'MISS',
        latencyMs: 30 + i,
        statusCode: 200,
        bytes: 500
      });
    }

    const history = collector.getRequests();
    assert.strictEqual(history.length, 10, 'History must be bounded to maxHistory');

    // Verify latest record is the most recent (file-25)
    assert.strictEqual(history[0].requestedFilename, 'file-25.txt');

    // Verify all 7 required properties per record
    const sample = history[0];
    assert.ok(sample.requestId, 'Missing Request ID');
    assert.strictEqual(sample.requestedFilename, 'file-25.txt', 'Missing Requested filename');
    assert.ok(sample.selectedEdge, 'Missing Selected edge');
    assert.ok(sample.cacheStatus, 'Missing Cache status');
    assert.strictEqual(typeof sample.responseLatency, 'number', 'Response latency must be number (ms)');
    assert.ok(sample.timestamp, 'Missing Timestamp');
    assert.strictEqual(typeof sample.httpStatusCode, 'number', 'HTTP status code must be number');
  });

  // ==========================================
  // Section 2: HTTP API Endpoints Tests
  // ==========================================
  console.log('\n2. API Endpoints Integration Tests:');

  const testApp = express();
  testApp.use(express.json());
  const testCollector = new MetricsCollector();

  // Populate realistic test traffic
  testCollector.recordRequest({ filename: 'sample.txt', edgeId: 'mumbai', cacheStatus: 'MISS', latencyMs: 35, statusCode: 200, bytes: 1000 });
  testCollector.recordRequest({ filename: 'sample.txt', edgeId: 'mumbai', cacheStatus: 'HIT', latencyMs: 8, statusCode: 200, bytes: 1000 });
  testCollector.recordRequest({ filename: 'data.json', edgeId: 'singapore', cacheStatus: 'MISS', latencyMs: 85, statusCode: 200, bytes: 2500 });
  testCollector.recordRequest({ filename: 'banner.svg', edgeId: 'frankfurt', cacheStatus: 'HIT', latencyMs: 15, statusCode: 200, bytes: 3200 });

  testApp.use('/api/metrics', createMetricsRouter(testCollector));

  const server = await new Promise(resolve => {
    const s = testApp.listen(0, () => resolve(s));
  });
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/metrics`;

  try {
    // 1. GET /api/metrics/overview
    await test('GET /api/metrics/overview returns required global metrics', async () => {
      const res = await fetch(`${baseUrl}/overview`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();

      assert.strictEqual(data.totalRequests, 4);
      assert.strictEqual(data.totalCacheHits, 2);
      assert.strictEqual(data.totalCacheMisses, 2);
      assert.strictEqual(data.overallCacheHitRatio, 50.0);
      assert.strictEqual(data.totalOriginRequests, 2);
      assert.strictEqual(data.totalBytesServed, 7700);
      assert.strictEqual(data.failedRequests, 0);
      assert.strictEqual(typeof data.averageResponseLatency, 'number');
      assert.strictEqual(data.averageResponseLatency, 35.75); // (35 + 8 + 85 + 15) / 4 = 35.75 ms
    });

    // 2. GET /api/metrics/edges
    await test('GET /api/metrics/edges returns array of 4 edges with per-edge metrics', async () => {
      const res = await fetch(`${baseUrl}/edges`);
      assert.strictEqual(res.status, 200);
      const edges = await res.json();

      assert.ok(Array.isArray(edges));
      assert.strictEqual(edges.length, 4);

      for (const edge of edges) {
        assert.ok(edge.id, 'Missing edge id');
        assert.ok(edge.name, 'Missing edge name');
        assert.ok(edge.location, 'Missing location');
        assert.ok(edge.healthStatus, 'Missing health status');
        assert.strictEqual(typeof edge.requestsHandled, 'number', 'Missing requests handled');
        assert.strictEqual(typeof edge.cacheHits, 'number', 'Missing cache hits');
        assert.strictEqual(typeof edge.cacheMisses, 'number', 'Missing cache misses');
        assert.strictEqual(typeof edge.cacheHitRatio, 'number', 'Missing cache hit ratio');
        assert.strictEqual(typeof edge.bytesServed, 'number', 'Missing bytes served');
        assert.strictEqual(typeof edge.averageResponseLatency, 'number', 'Missing avg response latency');
      }

      const mumbai = edges.find(e => e.id === 'mumbai');
      assert.strictEqual(mumbai.requestsHandled, 2);
      assert.strictEqual(mumbai.cacheHits, 1);
      assert.strictEqual(mumbai.cacheMisses, 1);
      assert.strictEqual(mumbai.cacheHitRatio, 50.0);
      assert.strictEqual(mumbai.bytesServed, 2000);
      assert.strictEqual(mumbai.averageResponseLatency, 21.5); // (35 + 8) / 2
    });

    // 3. GET /api/metrics/requests
    await test('GET /api/metrics/requests returns recent request history records', async () => {
      const res = await fetch(`${baseUrl}/requests`);
      assert.strictEqual(res.status, 200);
      const requests = await res.json();

      assert.ok(Array.isArray(requests));
      assert.strictEqual(requests.length, 4);

      for (const r of requests) {
        assert.ok(r.requestId, 'Missing Request ID');
        assert.ok(r.requestedFilename, 'Missing Requested filename');
        assert.ok(r.selectedEdge, 'Missing Selected edge');
        assert.ok(r.cacheStatus, 'Missing Cache status');
        assert.strictEqual(typeof r.responseLatency, 'number', 'Response latency must be number (ms)');
        assert.ok(r.timestamp, 'Missing Timestamp');
        assert.strictEqual(typeof r.httpStatusCode, 'number', 'HTTP status code must be number');
      }
    });

    // 4. GET /api/metrics/bandwidth
    await test('GET /api/metrics/bandwidth returns bandwidth distribution and cache savings', async () => {
      const res = await fetch(`${baseUrl}/bandwidth`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();

      assert.strictEqual(data.totalBytesServed, 7700);
      assert.strictEqual(data.originBytesServed, 3500); // 1000 (mumbai miss) + 2500 (singapore miss)
      assert.strictEqual(data.bandwidthSavedBytes, 4200); // 1000 (mumbai hit) + 3200 (frankfurt hit)
      assert.ok(Array.isArray(data.edges));
      assert.strictEqual(data.edges.length, 4);
    });

    // 5. GET /api/metrics/cache
    await test('GET /api/metrics/cache returns cache efficiency and hit ratio statistics', async () => {
      const res = await fetch(`${baseUrl}/cache`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();

      assert.strictEqual(data.overallCacheHitRatio, 50.0);
      assert.strictEqual(data.totalHits, 2);
      assert.strictEqual(data.totalMisses, 2);
      assert.strictEqual(data.totalOriginRequests, 2);
      assert.ok(Array.isArray(data.edges));
      assert.strictEqual(data.edges.length, 4);
    });

  } finally {
    server.close();
  }

  console.log(`\nAll ${passedTests}/${totalTests} Metrics Collection tests passed successfully!\n`);
}

runTests().catch(err => {
  console.error('\nTest suite failed with error:', err);
  process.exit(1);
});

