# Flow EVM Block Explorer

A modern block explorer for Flow EVM (Chain ID: 747) built with React, Express, and Ponder.sh.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    React Frontend (Vite + Ant Design)           │
│  Routes: /blocks, /block/:num, /tx/:hash, /account/:addr        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 API Gateway (Express + Redis cache)             │
│  Aggregates: Direct RPC + Ponder GraphQL                        │
└─────────────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
┌─────────────────┐          ┌─────────────────┐
│  viem RPC Client │          │  Ponder Indexer │
│  (Real-time data)│          │  (Historical)   │
└─────────────────┘          └─────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│              Flow EVM RPC (Chain ID: 747)                       │
│        https://mainnet.evm.nodes.onflow.org                     │
└─────────────────────────────────────────────────────────────────┘
```

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Ant Design, Framer Motion
- **API**: Node.js, Express, Redis (caching), viem
- **Indexer**: Ponder.sh, PostgreSQL
- **Monorepo**: pnpm workspaces, Turborepo

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm 9+
- Docker (for PostgreSQL and Redis)

### Installation

```bash
# Install dependencies
pnpm install

# Start databases
pnpm db:up

# Run all services in development
pnpm dev
```

### Individual Services

```bash
# Frontend only (http://localhost:3000)
pnpm frontend:dev

# API only (http://localhost:3001)
pnpm api:dev

# Indexer only
pnpm indexer:dev
```

## Project Structure

```
block-explorer-flow/
├── packages/
│   ├── frontend/          # React + Vite + Ant Design
│   ├── api/               # Express API gateway
│   └── indexer/           # Ponder.sh indexer
├── docker-compose.yml     # PostgreSQL, Redis
├── package.json           # pnpm workspace root
└── turbo.json             # Monorepo config
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/blocks` | Get latest blocks |
| `GET /api/blocks/:id` | Get block by number or hash |
| `GET /api/blocks/:id/transactions` | Get block transactions |
| `GET /api/transactions/:hash` | Get transaction details |
| `GET /api/accounts/:address` | Get account info |
| `GET /api/search?q=...` | Universal search |

## Configuration

All services can be configured via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `FLOW_EVM_RPC_URL` | `https://mainnet.evm.nodes.onflow.org` | Flow EVM RPC endpoint |
| `DATABASE_URL` | `postgresql://...` | PostgreSQL connection string |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string |
| `API_PORT` | `3001` | API server port |
| `VITE_API_URL` | `/api` | Frontend API base URL |

## Networks

- **Mainnet**: Chain ID 747
- **Testnet**: Chain ID 545

Switch networks using the dropdown in the header.

## License

MIT
