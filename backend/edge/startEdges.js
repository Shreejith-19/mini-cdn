import { createEdgeApp } from './edgeServer.js';
import { EDGE_PRESETS } from './config.js';

export function startAllEdges() {
  console.log('\n======================================================');
  console.log('🚀 Starting 4 Independent Mini CDN Edge Server Instances');
  console.log('======================================================\n');

  const runningServers = [];

  for (const [key, preset] of Object.entries(EDGE_PRESETS)) {
    // Each instance gets its own independent in-memory cache and metrics
    const { app, config } = createEdgeApp(preset);

    const server = app.listen(config.port, () => {
      console.log(`  ⚡ [${config.name}] running on http://localhost:${config.port}`);
      console.log(`     Location: ${config.location}`);
      console.log(`     Diagnostics: http://localhost:${config.port}/`);
      console.log(`     Health: http://localhost:${config.port}/health`);
    });

    runningServers.push({ key, server, config });
  }

  return runningServers;
}

if (process.argv[1] && process.argv[1].endsWith('startEdges.js')) {
  startAllEdges();
}
