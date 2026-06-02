# AI Stock Advisor

AI Stock Advisor is an MVP monorepo for a stock-analysis web app, NestJS API,
Telegram integration, scheduled jobs, and an isolated TradingAgents service.
The initial scaffold uses mock data only. It does not call live market-data
providers or run real trading analysis.

## Repository Layout

```text
apps/
  web/                    # Next.js app and mock web endpoint
  api/                    # NestJS API and mock stock endpoints
packages/
  shared/                 # Shared TypeScript request and response types
services/
  trading-agent/          # Placeholder Python FastAPI service
docker-compose.yml        # Local MongoDB and Redis
```

## Prerequisites

- Node.js 20 or newer
- npm 10 or newer
- Python 3.12 or newer
- Docker with Docker Compose

## Local Setup

Install Node dependencies from the repository root:

```bash
npm install
```

Copy the sanitized environment examples when you begin configuring services:

```bash
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
cp services/trading-agent/.env.example services/trading-agent/.env
```

Start MongoDB and Redis:

```bash
docker compose up -d
```

Run the web app at `http://localhost:3000`:

```bash
npm run dev:web
```

Run the NestJS API at `http://localhost:3001`:

```bash
npm run dev:api
```

Run the placeholder TradingAgents service at `http://localhost:8000`:

```bash
cd services/trading-agent
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The TradingAgents placeholder can also be built and run with Docker:

```bash
docker build -t ai-stock-advisor-trading-agent services/trading-agent
docker run --rm -p 8000:8000 ai-stock-advisor-trading-agent
```

## Mock Endpoints

| Service | Method | Endpoint | Purpose |
| --- | --- | --- | --- |
| Web | `GET` | `http://localhost:3000/api/stocks/mock` | Mock quotes from Next.js |
| API | `GET` | `http://localhost:3001/health` | NestJS health check |
| API | `GET` | `http://localhost:3001/stocks/mock` | Mock stock watchlist |
| API | `GET` | `http://localhost:3001/stocks/mock/AAPL` | Mock quote by symbol |
| Trading agent | `GET` | `http://localhost:8000/health` | FastAPI health check |
| Trading agent | `POST` | `http://localhost:8000/analysis/mock` | Placeholder analysis |

Example placeholder analysis request:

```bash
curl -X POST http://localhost:8000/analysis/mock \
  -H 'content-type: application/json' \
  -d '{"symbol":"AAPL"}'
```

## Environment Variables

The scaffold includes sanitized `.env.example` files. The API example reserves
configuration for MongoDB, Redis, Telegram, and the TradingAgents URL. Telegram,
MongoDB, and Redis application integrations are intentionally not wired yet.
Never commit real tokens or credentials.

## Scheduled Jobs

BullMQ scheduling is planned but not implemented in this initial scaffold.
Redis is included in Docker Compose so the first scheduled-update vertical slice
can add retryable, typed jobs without changing local infrastructure.

## Quality Commands

```bash
npm run lint
npm run type-check
npm run test
npm run build
```

## Deployment

AWS deployment is intentionally deferred until the MVP behavior is established.
