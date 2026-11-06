# Mini CDN Simulator

A simplified Content Delivery Network (CDN) simulator designed to demonstrate CDN architecture, edge caching, intelligent routing, and performance monitoring.

## Architecture Overview

```
                      +-----------------------------+
                      |   React Dashboard (:5173)   |
                      +--------------+--------------+
                                     |
                                     v
                      +-----------------------------+
                      |      CDN Router (:9000)     |
                      |  Intelligent Geo / Latency  |
                      +--------------+--------------+
                                     |
         +-----------------+---------+---------+-----------------+
         |                 |                   |                 |
         v                 v                   v                 v
+-----------------+ +-----------------+ +-----------------+ +-----------------+
|   Mumbai Edge   | | Singapore Edge  | | Frankfurt Edge  | |  New York Edge  |
|     (:8001)     | |     (:8002)     | |     (:8003)     | |     (:8004)     |
| In-Memory Cache | | In-Memory Cache | | In-Memory Cache | | In-Memory Cache |
+--------+--------+ +--------+--------+ +--------+--------+ +--------+--------+
         |                   |                 |                 |
         +-----------------+---------+---------+-----------------+
                                     |  (Cache Miss Fetch)
                                     v
                      +-----------------------------+
                      |    Origin Server (:8000)    |
                      |   Authoritative Storage     |
                      |  + Diagnostics UI (EJS)     |
                      +-----------------------------+
```

## Service Port Allocation

| Service | Port | Description |
| :--- | :--- | :--- |
| **Origin Server** | `8000` | Authoritative storage, synthetic latency simulation, EJS diagnostics |
| **Mumbai Edge** | `8001` | Edge PoP serving Asia-South clients with local in-memory cache |
| **Singapore Edge** | `8002` | Edge PoP serving Asia-Southeast clients with local in-memory cache |
| **Frankfurt Edge** | `8003` | Edge PoP serving Europe-Central clients with local in-memory cache |
| **New York Edge** | `8004` | Edge PoP serving US-East clients with local in-memory cache |
| **CDN Router** | `9000` | Intelligent routing engine (Geo-proximity, latency, failover) |
| **Dashboard** | `5173` | Interactive React + Vite + Tailwind + Recharts monitoring UI |

## Development Roadmap

- [x] **Stage 1: Origin Server & Diagnostic Interface (`:8000`)**
  - Express server with in-memory telemetry (requests, bytes, latency).
  - Configurable simulated geographic latency (`SIMULATED_LATENCY_MS`).
  - Content delivery with HTTP headers (`Cache-Control`, `ETag`, `Content-Type`).
  - Backend-rendered EJS diagnostic interface (`/diagnostics`).
  - Automated test suite.
- [ ] **Stage 2: Edge Server Engine & In-Memory Cache (`:8001 - :8004`)**
  - Configurable edge server instances (Mumbai, Singapore, Frankfurt, New York).
  - In-memory cache store with TTL, LRU eviction, and `X-Cache: HIT / MISS` headers.
  - Cache invalidation / purge API.
  - Per-edge EJS diagnostic view.
- [ ] **Stage 3: CDN Router & Intelligent Routing Engine (`:9000`)**
  - Geo-proximity routing, Latency-based routing, and Round-Robin.
  - Automatic health checking and failover.
  - Request proxying and timing headers.
- [ ] **Stage 4: React Dashboard Frontend (`:5173`)**
  - Interactive topology and latency comparison charts.
  - Real-time cache hit ratios and bandwidth metrics.
  - Hop-by-hop latency breakdown and request simulator.
- [ ] **Stage 5: Docker & Docker Compose Integration**
  - Multi-container orchestration for Origin, 4 Edges, Router, and Frontend.

## Quickstart (Stage 1)

```bash
# Start the Origin Server
npm run start:origin

# In another terminal, run Origin automated tests
npm run test:origin
```
View the Origin Diagnostic UI at: `http://localhost:8000/diagnostics`
