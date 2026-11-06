# Mini CDN Simulator

A simplified Content Delivery Network (CDN) simulator demonstrating CDN architecture, edge caching, intelligent routing, and performance monitoring.

## Project Structure

```
mini-cdn/
├── backend/
│   ├── origin/          # Origin server implementation
│   ├── edge/            # Edge server engine & in-memory cache
│   ├── router/          # Intelligent CDN routing engine
│   ├── middleware/      # Express middlewares (logging, metrics, CORS)
│   ├── metrics/         # Metrics collection and telemetry
│   ├── views/           # EJS backend diagnostic templates
│   ├── public/          # Backend static assets
│   ├── config/          # Central configuration
│   ├── server.js        # Main Express server entry point
│   └── package.json     # Backend dependencies (Express, EJS, CORS)
│
├── frontend/
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Route views & dashboards
│   │   ├── layouts/     # Application layout wrappers
│   │   ├── services/    # Modular API communication client
│   │   ├── hooks/       # Custom React hooks
│   │   ├── charts/      # Recharts visualizations
│   │   ├── App.jsx      # React router & route configuration
│   │   └── main.jsx     # Vite React application entry
│   └── package.json     # Frontend dependencies (React, Vite, Tailwind, Recharts, Lucide)
│
├── benchmarks/          # Latency & throughput test benchmarks
├── docker-compose.yml   # Multi-service container orchestration
└── README.md            # Architecture & documentation
```

## Quick Start

### 1. Backend Server (Express + EJS)

```bash
cd backend
npm install
npm start
```
- EJS View: `http://localhost:8000/`
- Health Endpoint: `http://localhost:8000/health`

### 2. Frontend Application (React + Vite + Tailwind)

```bash
cd frontend
npm install
npm run dev
```
- React Dashboard: `http://localhost:5173/`

### 3. Root Convenience Scripts

```bash
# Start backend
npm run start:backend

# Start frontend dev server
npm run dev:frontend
```
