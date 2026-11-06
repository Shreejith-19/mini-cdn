# Mini CDN Simulator

A full-stack, distributed Content Delivery Network (CDN) simulator demonstrating real-world edge caching architecture, intelligent routing algorithms, dynamic health failover, in-memory LRU eviction, backend metrics collection, and live infrastructure monitoring dashboard.

---

## Architecture Overview

```
                           ┌────────────────────────┐
                           │      React Client      │
                           │     (Port :5173)       │
                           └───────────┬────────────┘
                                       │
                                       │ HTTP Requests
                                       ▼
                           ┌────────────────────────┐
                           │    Central CDN Router  │
                           │      (Port :9000)      │
                           └───────────┬────────────┘
                                       │
                  ┌────────────────────┼────────────────────┐
                  │                    │                    │
        ┌─────────▼────────┐  ┌────────▼─────────┐  ┌───────▼──────────┐
        │   Mumbai Edge    │  │  Singapore Edge  │  │  Frankfurt Edge  │
        │   (Port :8001)   │  │   (Port :8002)   │  │   (Port :8003)   │
        │  Latency: 35 ms  │  │  Latency: 80 ms  │  │ Latency: 150 ms  │
        └─────────┬────────┘  └────────┬─────────┘  └───────┬──────────┘
                  │                    │                    │
                  └────────────────────┼────────────────────┘
                                       │
                         Cache MISS    │ (Authoritative Fetch)
                                       ▼
                           ┌────────────────────────┐
                           │  Origin Storage Server │
                           │      (Port :8000)      │
                           └────────────────────────┘
```

---

## Service Topology & Port Allocation

| Service | Port | Endpoint URL | Role & Simulated Latency |
|---|---|---|---|
| **Origin Storage** | `8000` | `http://localhost:8000` | Authoritative disk storage & asset catalog |
| **Mumbai Edge** | `8001` | `http://localhost:8001` | Edge PoP — Asia-South (**35 ms** simulated latency) |
| **Singapore Edge** | `8002` | `http://localhost:8002` | Edge PoP — Asia-Southeast (**80 ms** simulated latency) |
| **Frankfurt Edge** | `8003` | `http://localhost:8003` | Edge PoP — Europe-Central (**150 ms** simulated latency) |
| **New York Edge** | `8004` | `http://localhost:8004` | Edge PoP — US-East (**180 ms** simulated latency) |
| **CDN Router Engine** | `9000` | `http://localhost:9000` | Intelligent routing, health probing & telemetry |
| **React Dashboard** | `5173` | `http://localhost:5173` | Infrastructure telemetry & monitoring UI |

---

## Core Architecture Components

### 1. Authoritative Origin Server (`:8000`)
- **Asset Storage**: Stores static assets in `backend/origin/storage/` (supports `TXT`, `JSON`, `SVG`, `HTML`, `CSS`, `JS`, `PNG`, `MP4`, `PDF`).
- **HTTP Caching Headers**: Serves files with RFC-compliant `Cache-Control: public, max-age=60` and `ETag` headers.
- **Conditional Validation**: Supports conditional requests via `If-None-Match`, returning `304 Not Modified` when content has not changed.
- **Upload & File APIs**: Provides endpoints for `POST /origin/upload`, `GET /origin/files`, `GET /origin/content/:filename`, and `GET /origin/stats`.
- **EJS Diagnostics**: Available at `http://localhost:8000/origin`.

### 2. Independent Edge Fleet (`:8001` - `:8004`)
- **Custom In-Memory LRU Cache**: Implemented in pure JavaScript using `Map` for $O(1)$ lookup and eviction:
  - Max capacity: `100` objects per edge.
  - Time-To-Live (TTL): `60` seconds per entry.
  - Eviction policy: Discards least-recently accessed object when capacity is exceeded.
- **Cache HIT vs Cache MISS Pipeline**:
  - **HIT**: Served directly from edge RAM without touching the Origin server. Emits `X-Cache: HIT` and `X-Origin-Contacted: No`.
  - **MISS**: Fetches file from Origin (`:8000`), caches the buffer in memory, and returns it to the client with `X-Cache: MISS` and `X-Origin-Contacted: Yes`.
- **Cache Management**: Endpoints for inspecting cache contents (`GET /cache`) and purging cache (`DELETE /cache`).

### 3. Central CDN Router (`:9000`)
- **Intelligent Routing Algorithms**:
  - `ROUND_ROBIN`: Sequentially balances traffic in a cyclic fashion across active, healthy edge servers.
  - `LOWEST_LATENCY`: Evaluates healthy edges and routes traffic to the node with the lowest ping (Mumbai at 35 ms, or next lowest if offline).
- **Health Probing**: Periodically probes `/health` on all four edge servers every 5 seconds. Automatically marks nodes `UNHEALTHY` after consecutive failures and restores routing once recovered.
- **Administrative Failure Simulation**:
  - `POST /admin/edges/:id/failure` — Manually disable an edge to test automatic failover.
  - `POST /admin/edges/:id/recover` — Restore an edge back to the active routing pool.

### 4. Backend Metrics Collection Module
- **Zero Fabricated Metrics**: All statistics are calculated from actual backend network activity.
- **Bounded In-Memory History**: Circular buffer keeping the last 200 requests to guarantee predictable memory footprint.
- **Telemetry Endpoints**:
  - `GET /api/metrics/overview`: Global request counts, cache hit ratio, bytes served, origin requests, average latency.
  - `GET /api/metrics/edges`: Per-edge request volume, cache hits/misses, and health status.
  - `GET /api/metrics/requests`: Recent audit log with Request ID, filename, selected edge, cache status, latency, and HTTP status.
  - `GET /api/metrics/bandwidth`: Egress bandwidth and total bytes saved by edge caching.
  - `GET /api/metrics/cache`: Cache efficiency distribution and offload rate.

---

## Interactive React Dashboard (`:5173`)

Built with React, Vite, Tailwind CSS, Recharts, and Lucide React, adhering strictly to a professional infrastructure monitoring aesthetic:

- **Overview Page**: Metric summary cards with period-over-period delta tracking, Recharts bandwidth and throughput charts, compact edge status cards, and live audit stream.
- **Requests Activity Page**: Searchable and filterable request table, coupled with the **Interactive Request Simulator** allowing users to select files, toggle algorithms, and observe hop-by-hop request flow:
  $$\text{Client} \to \text{CDN Router} \to \text{Selected Edge} \to \text{Origin Storage (only on MISS)} \to \text{Client}$$
- **Edge Servers Fleet Page**: Four dedicated PoP cards (Mumbai, Singapore, Frankfurt, New York) with live health indicators (Green: Healthy, Red: Offline, Yellow: Degraded), cache capacity gauges, cache purge controls, and failure simulation triggers.
- **Edge Details Modal**: Deep inspection panel displaying cache occupancy, object lists, and edge request logs.
- **Cache Analytics Page**: Hit ratio gauges, hits vs misses distribution, offload percentage, and origin catalog.
- **Performance Page**: Latency percentiles (P50, P90, P99), TTFB comparisons, and speedup benchmarks.
- **Settings Page**: Live routing strategy reconfiguration (`ROUND_ROBIN` vs `LOWEST_LATENCY`).

---

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm (v9+)

### Installation
Clone the repository and install dependencies for both backend and frontend:

```bash
git clone https://github.com/Shreejith-19/mini-cdn.git
cd mini-cdn
npm run install:all
```

---

## Running the Services

### Option A: Local Development (Recommended)

Start all services using root convenience scripts in separate terminal windows:

```bash
# Terminal 1: Origin Server (Port 8000)
npm run start:origin

# Terminal 2: Four Edge Servers (Ports 8001, 8002, 8003, 8004)
npm run start:edges

# Terminal 3: Central CDN Router (Port 9000)
npm run start:router

# Terminal 4: React Dashboard (Port 5173)
npm run dev:frontend
```

Once running:
- **React Dashboard**: Open [http://localhost:5173](http://localhost:5173)
- **CDN Router Diagnostics**: Open [http://localhost:9000/router](http://localhost:9000/router)
- **Origin Diagnostics**: Open [http://localhost:8000/origin](http://localhost:8000/origin)

---

### Option B: Docker Compose (All 7 Microservices)

The project includes dedicated Dockerfiles for each architectural tier:
- **Origin Server**: [`backend/origin/Dockerfile`](file:///backend/origin/Dockerfile)
- **Edge Server**: [`backend/edge/Dockerfile`](file:///backend/edge/Dockerfile)
- **CDN Router**: [`backend/router/Dockerfile`](file:///backend/router/Dockerfile)
- **React Frontend**: [`frontend/Dockerfile`](file:///frontend/Dockerfile)

All services communicate using Docker internal service names (`origin`, `edge-mumbai`, `edge-singapore`, `edge-frankfurt`, `edge-newyork`, `router`, `frontend`) across an isolated bridge network (`cdn-network`).

Spin up all 7 independent microservices in parallel with a single command:

```bash
docker compose up --build
```

Container mapping:
- `origin` (`:8000`)
- `edge-mumbai` (`:8001`)
- `edge-singapore` (`:8002`)
- `edge-frankfurt` (`:8003`)
- `edge-newyork` (`:8004`)
- `router` (`:9000`)
- `frontend` (`:5173`)

To stop and remove containers:
```bash
docker compose down
```

---

## Testing & Benchmarks

The project includes unit, integration, end-to-end, and performance benchmarking suites:

```bash
# Run Comprehensive Final Verification Suite (11/11 criteria)
npm run test:final

# Run Metrics Collection unit tests (10/10 tests)
npm run test:metrics

# Run Request Simulator backend tests (5/5 tests)
npm run test:simulator

# Run Origin Server integration tests (requires origin running)
npm run test:origin

# Run Edge Servers integration tests (requires edges running)
npm run test:edge

# Run Router failover tests (requires origin, edges, and router running)
npm run test:router

# Run CDN Performance & Latency Benchmark Suite
npm run benchmark

# Run 3-Scenario Autocannon Load Testing Suite
npm run test:load
```

---

## Failure Simulation & Routing Verification

Test automatic failover and routing strategies via `curl`:

```bash
# 1. Switch router to LOWEST_LATENCY strategy
curl -X PUT http://localhost:9000/cdn/config \
  -H "Content-Type: application/json" \
  -d '{"strategy": "LOWEST_LATENCY"}'

# 2. Request asset — routes to Mumbai (35ms, lowest latency)
curl -i http://localhost:9000/cdn/content/sample.txt

# 3. Simulate failure: Mark Mumbai Edge offline
curl -X POST http://localhost:9000/admin/edges/mumbai/failure

# 4. Request asset again — automatically fails over to Singapore (80ms)
curl -i http://localhost:9000/cdn/content/sample.txt

# 5. Restore Mumbai Edge
curl -X POST http://localhost:9000/admin/edges/mumbai/recover

# 6. Request asset again — immediately resumes routing to Mumbai
curl -i http://localhost:9000/cdn/content/sample.txt
```

---

## Project Structure

```
mini-cdn/
├── backend/
│   ├── origin/                  # Origin storage server & upload routes
│   │   ├── storage/             # Content asset files (TXT, JSON, SVG, etc.)
│   │   ├── originRouter.js      # Origin Express router
│   │   └── origin.test.js       # Origin test suite
│   ├── edge/                    # Edge server engine & LRU cache
│   │   ├── cache.js             # Custom in-memory LRU cache implementation
│   │   ├── edgeServer.js        # Independent edge Express server
│   │   ├── startEdges.js        # Multi-edge orchestrator (Ports 8001-8004)
│   │   └── edge.test.js         # Edge test suite
│   ├── router/                  # Central CDN router & decision engine
│   │   ├── routerServer.js      # Router Express app, algorithms & health checks
│   │   └── router.test.js       # Routing & failover test suite
│   ├── metrics/                 # Telemetry & metrics collector
│   │   ├── metricsCollector.js  # Circular in-memory metrics aggregator
│   │   ├── metricsRouter.js     # Metrics REST endpoints
│   │   └── metrics.test.js      # Metrics unit & API test suite
│   ├── test-simulator.js        # Request simulator backend integration test
│   ├── views/                   # EJS diagnostic templates (origin, edge, router)
│   ├── server.js                # Origin entrypoint
│   └── package.json             # Backend dependencies
│
├── frontend/
│   ├── src/
│   │   ├── components/          # UI components (RequestSimulator, Modal, Cards)
│   │   ├── pages/               # React route pages (Overview, Requests, Edges, etc.)
│   │   ├── layouts/             # Root layout with navy sidebar & top header
│   │   ├── services/            # api.js client layer
│   │   ├── hooks/               # useCdnData.js single-poller hook
│   │   ├── App.jsx              # React Router configuration
│   │   └── main.jsx             # React DOM entrypoint
│   └── package.json             # Frontend dependencies
│
├── benchmarks/
│   ├── benchmark.js             # Latency & acceleration benchmark suite
│   └── benchmark-results.json   # Output benchmark results
│
├── docker-compose.yml           # 7-service container orchestration
└── README.md                    # Comprehensive documentation
```

---

## License

This project is licensed under the MIT License.
