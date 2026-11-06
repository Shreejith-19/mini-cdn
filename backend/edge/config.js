/**
 * Edge Server Configuration Presets & Environment Resolver
 */
export const EDGE_PRESETS = {
  mumbai: {
    id: 'edge-mumbai',
    name: 'Mumbai Edge',
    city: 'Mumbai',
    region: 'Asia-South',
    port: 8001,
    coordinates: [19.0760, 72.8777],
    simulatedLatencyMs: 8
  },
  singapore: {
    id: 'edge-singapore',
    name: 'Singapore Edge',
    city: 'Singapore',
    region: 'Asia-Southeast',
    port: 8002,
    coordinates: [1.3521, 103.8198],
    simulatedLatencyMs: 12
  },
  frankfurt: {
    id: 'edge-frankfurt',
    name: 'Frankfurt Edge',
    city: 'Frankfurt',
    region: 'Europe-Central',
    port: 8003,
    coordinates: [50.1109, 8.6821],
    simulatedLatencyMs: 15
  },
  newyork: {
    id: 'edge-newyork',
    name: 'New York Edge',
    city: 'New York',
    region: 'US-East',
    port: 8004,
    coordinates: [40.7128, -74.0060],
    simulatedLatencyMs: 10
  }
};

/**
 * Resolves active edge configuration from env vars and CLI flags.
 */
export function resolveEdgeConfig() {
  const args = process.argv.slice(2);
  let presetKey = 'mumbai';

  // Check for --edge=flag
  for (const arg of args) {
    if (arg.startsWith('--edge=')) {
      presetKey = arg.split('=')[1].toLowerCase();
    }
  }

  // Check for EDGE_ID or PORT env vars
  if (process.env.EDGE_ID) {
    const found = Object.keys(EDGE_PRESETS).find(k => EDGE_PRESETS[k].id === process.env.EDGE_ID || k === process.env.EDGE_ID);
    if (found) presetKey = found;
  } else if (process.env.PORT) {
    const port = parseInt(process.env.PORT, 10);
    const found = Object.keys(EDGE_PRESETS).find(k => EDGE_PRESETS[k].port === port);
    if (found) presetKey = found;
  }

  const preset = EDGE_PRESETS[presetKey] || EDGE_PRESETS.mumbai;

  return {
    id: process.env.EDGE_ID || preset.id,
    name: process.env.EDGE_NAME || preset.name,
    city: preset.city,
    region: process.env.EDGE_REGION || preset.region,
    port: parseInt(process.env.PORT || process.env.EDGE_PORT || preset.port, 10),
    coordinates: preset.coordinates,
    simulatedLatencyMs: parseInt(process.env.SIMULATED_EDGE_LATENCY_MS || preset.simulatedLatencyMs, 10),
    originUrl: process.env.ORIGIN_URL || 'http://localhost:8000',
    cacheMaxEntries: parseInt(process.env.CACHE_MAX_ENTRIES || '100', 10),
    cacheDefaultTtlSec: parseInt(process.env.CACHE_DEFAULT_TTL_SEC || '3600', 10)
  };
}
