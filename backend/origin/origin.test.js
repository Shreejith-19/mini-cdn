import assert from 'assert';
import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.ORIGIN_URL || 'http://localhost:8000';

async function runTests() {
  console.log(`\n========================================`);
  console.log(`🧪 Testing Origin Server at ${BASE_URL}`);
  console.log(`========================================\n`);

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

  // 1. Test EJS Diagnostic Page (GET /origin)
  await test('GET /origin renders EJS diagnostic page with all 4 required metrics', async () => {
    const res = await fetch(`${BASE_URL}/origin`);
    assert.strictEqual(res.status, 200);
    assert.ok(res.headers.get('content-type').includes('text/html'));
    const html = await res.text();

    // Verify 4 required metrics displayed
    assert.ok(html.includes('Origin Server Status'), 'Missing Origin server status');
    assert.ok(html.includes('ONLINE'), 'Missing ONLINE status value');
    assert.ok(html.includes('Available Files'), 'Missing Available Files metric');
    assert.ok(html.includes('Total Requests'), 'Missing Total Requests metric');
    assert.ok(html.includes('Total Bandwidth Served'), 'Missing Total Bandwidth Served metric');
  });

  // 2. Test GET /origin/files
  let initialFilesCount = 0;
  await test('GET /origin/files returns list of available files with metadata', async () => {
    const res = await fetch(`${BASE_URL}/origin/files`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.files), 'Expected files array');
    assert.strictEqual(typeof data.count, 'number');
    initialFilesCount = data.count;
    if (data.files.length > 0) {
      const sample = data.files[0];
      assert.ok(sample.filename, 'Missing filename');
      assert.ok(sample.mimeType, 'Missing mimeType');
      assert.ok(typeof sample.size === 'number', 'Missing size');
      assert.ok(sample.url, 'Missing url');
    }
  });

  // 3. Test POST /origin/upload (Valid file)
  const testFileName = `test-item-${Date.now()}.json`;
  const testFileContent = JSON.stringify({ message: 'Mini CDN Origin Upload Test', timestamp: Date.now() });

  await test('POST /origin/upload uploads a valid JSON file and returns metadata', async () => {
    const blob = new Blob([testFileContent], { type: 'application/json' });
    const formData = new FormData();
    formData.append('file', blob, testFileName);

    const res = await fetch(`${BASE_URL}/origin/upload`, {
      method: 'POST',
      body: formData
    });

    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.strictEqual(data.message, 'File uploaded successfully');
    assert.strictEqual(data.file.filename, testFileName);
    assert.strictEqual(data.file.mimeType, 'application/json; charset=utf-8');
    assert.strictEqual(data.file.size, Buffer.byteLength(testFileContent));
    assert.ok(data.file.etag, 'Missing etag in upload metadata');
    assert.strictEqual(data.file.url, `/origin/content/${encodeURIComponent(testFileName)}`);
  });

  // 4. Test POST /origin/upload (Unsupported file type rejection)
  await test('POST /origin/upload rejects unsupported file types (e.g. .exe)', async () => {
    const blob = new Blob(['binary data'], { type: 'application/octet-stream' });
    const formData = new FormData();
    formData.append('file', blob, 'malicious.exe');

    const res = await fetch(`${BASE_URL}/origin/upload`, {
      method: 'POST',
      body: formData
    });

    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.ok(data.error.includes('Unsupported file type'));
  });

  // 5. Test GET /origin/content/:filename
  let originalEtag = '';
  await test('GET /origin/content/:filename returns file with Cache-Control and ETag headers', async () => {
    const res = await fetch(`${BASE_URL}/origin/content/${encodeURIComponent(testFileName)}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('content-type'), 'application/json; charset=utf-8');
    assert.ok(res.headers.get('cache-control'), 'Missing Cache-Control header');
    assert.ok(res.headers.get('cache-control').includes('public'));
    assert.ok(res.headers.get('etag'), 'Missing ETag header');
    assert.strictEqual(res.headers.get('x-origin-server'), 'Origin-8000');

    originalEtag = res.headers.get('etag');
    const text = await res.text();
    assert.strictEqual(text, testFileContent);
  });

  // 6. Test conditional ETag request (304 Not Modified)
  await test('GET /origin/content/:filename with If-None-Match returns 304 Not Modified', async () => {
    const res = await fetch(`${BASE_URL}/origin/content/${encodeURIComponent(testFileName)}`, {
      headers: { 'If-None-Match': originalEtag }
    });
    assert.strictEqual(res.status, 304);
  });

  // 7. Test DELETE /origin/content/:filename
  await test('DELETE /origin/content/:filename deletes file from storage', async () => {
    const res = await fetch(`${BASE_URL}/origin/content/${encodeURIComponent(testFileName)}`, {
      method: 'DELETE'
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.message, 'File deleted successfully');

    // Confirm file is now 404
    const getRes = await fetch(`${BASE_URL}/origin/content/${encodeURIComponent(testFileName)}`);
    assert.strictEqual(getRes.status, 404);
  });

  // 8. Test GET /origin/stats
  await test('GET /origin/stats returns total requests, bytes served, and failed requests', async () => {
    const res = await fetch(`${BASE_URL}/origin/stats`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.status, 'online');
    assert.strictEqual(data.port, 8000);
    assert.ok(data.totalRequests > 0, `Expected totalRequests > 0, got ${data.totalRequests}`);
    assert.ok(data.bytesServed > 0, `Expected bytesServed > 0, got ${data.bytesServed}`);
    assert.ok(typeof data.bytesServedFormatted === 'string');
    assert.ok(data.failedRequests > 0, `Expected failedRequests > 0, got ${data.failedRequests}`);
    assert.strictEqual(typeof data.uptimeSeconds, 'number');
  });

  console.log(`\n========================================`);
  console.log(`🏁 Origin Server Results: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});

