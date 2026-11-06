/**
 * CDN Intelligent Routing Strategies
 * 
 * Supports:
 * - Geo-Proximity (Haversine formula based on client coordinates)
 * - Latency-Based (selects edge with lowest response latency)
 * - Round-Robin (circular distribution across healthy edges)
 * - Automatic Failover (skips unhealthy edge nodes)
 */

// Popular global cities coordinates for client location simulation
export const CLIENT_LOCATIONS = {
  // Asia
  'mumbai': { name: 'Mumbai, India', coordinates: [19.0760, 72.8777] },
  'delhi': { name: 'Delhi, India', coordinates: [28.6139, 77.2090] },
  'bangalore': { name: 'Bangalore, India', coordinates: [12.9716, 77.5946] },
  'singapore': { name: 'Singapore', coordinates: [1.3521, 103.8198] },
  'tokyo': { name: 'Tokyo, Japan', coordinates: [35.6762, 139.6503] },
  'sydney': { name: 'Sydney, Australia', coordinates: [-33.8688, 151.2093] },
  'dubai': { name: 'Dubai, UAE', coordinates: [25.2048, 55.2708] },
  
  // Europe
  'frankfurt': { name: 'Frankfurt, Germany', coordinates: [50.1109, 8.6821] },
  'london': { name: 'London, UK', coordinates: [51.5074, -0.1278] },
  'paris': { name: 'Paris, France', coordinates: [48.8566, 2.3522] },
  'amsterdam': { name: 'Amsterdam, Netherlands', coordinates: [52.3676, 4.9041] },
  
  // Americas
  'new york': { name: 'New York, USA', coordinates: [40.7128, -74.0060] },
  'chicago': { name: 'Chicago, USA', coordinates: [41.8781, -87.6298] },
  'los angeles': { name: 'Los Angeles, USA', coordinates: [34.0522, -118.2437] },
  'san francisco': { name: 'San Francisco, USA', coordinates: [37.7749, -122.4194] },
  'sao paulo': { name: 'São Paulo, Brazil', coordinates: [-23.5505, -46.6333] }
};

/**
 * Calculates Great-Circle Distance between two [lat, lon] points using the Haversine formula (in kilometers).
 */
export function calculateDistanceKm([lat1, lon1], [lat2, lon2]) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Parses client location string (city name or "lat,lon") into coordinates.
 */
export function resolveClientCoordinates(clientLocation) {
  if (!clientLocation) {
    return { name: 'Mumbai, India (Default)', coordinates: CLIENT_LOCATIONS.mumbai.coordinates };
  }

  const normalized = clientLocation.trim().toLowerCase();

  // Check known cities
  if (CLIENT_LOCATIONS[normalized]) {
    return CLIENT_LOCATIONS[normalized];
  }

  // Check partial match (e.g., "tokyo, japan" -> "tokyo")
  for (const [key, loc] of Object.entries(CLIENT_LOCATIONS)) {
    if (normalized.includes(key)) {
      return loc;
    }
  }

  // Check lat,lon format (e.g., "19.07,72.87")
  if (normalized.includes(',')) {
    const parts = normalized.split(',').map(s => parseFloat(s.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return { name: `Custom (${parts[0].toFixed(2)}, ${parts[1].toFixed(2)})`, coordinates: parts };
    }
  }

  // Default fallback
  return { name: 'Unknown Location (Default: Mumbai)', coordinates: CLIENT_LOCATIONS.mumbai.coordinates };
}

let roundRobinIndex = 0;

/**
 * Selects edge server based on routing strategy and node health.
 */
export function selectEdgeNode({ strategy = 'geo-proximity', clientLocation, edges = [] }) {
  // Filter for healthy edges
  const healthyEdges = edges.filter(e => e.status !== 'UNHEALTHY');
  const pool = healthyEdges.length > 0 ? healthyEdges : edges; // Fallback to all if none healthy

  if (pool.length === 0) {
    throw new Error('No edge nodes configured in routing table');
  }

  const client = resolveClientCoordinates(clientLocation);

  switch (strategy.toLowerCase()) {
    case 'round-robin': {
      const selected = pool[roundRobinIndex % pool.length];
      roundRobinIndex = (roundRobinIndex + 1) % pool.length;
      return {
        edge: selected,
        strategy: 'round-robin',
        client,
        reason: 'Evenly distributed across healthy edges'
      };
    }

    case 'latency-based': {
      // Pick edge with lowest current measured probe latency
      let lowest = pool[0];
      for (const edge of pool) {
        if ((edge.lastPingMs || 999) < (lowest.lastPingMs || 999)) {
          lowest = edge;
        }
      }
      return {
        edge: lowest,
        strategy: 'latency-based',
        client,
        reason: `Lowest measured ping latency (${lowest.lastPingMs || lowest.simulatedLatencyMs}ms)`
      };
    }

    case 'geo-proximity':
    default: {
      // Pick geographically closest edge node using Haversine formula
      let closest = pool[0];
      let minDistance = calculateDistanceKm(client.coordinates, pool[0].coordinates);

      for (const edge of pool) {
        const dist = calculateDistanceKm(client.coordinates, edge.coordinates);
        if (dist < minDistance) {
          minDistance = dist;
          closest = edge;
        }
      }

      return {
        edge: closest,
        strategy: 'geo-proximity',
        client,
        distanceKm: minDistance,
        reason: `Closest geographical edge (${minDistance} km away)`
      };
    }
  }
}

