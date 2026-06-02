# AI Stock Advisor

AI Stock Advisor is an MVP monorepo for a stock-analysis web app, NestJS API,
Telegram integration, scheduled jobs, and an isolated TradingAgents service.
The initial scaffold uses mock market data only. Google authentication is wired
for the web app and NestJS API, with users stored in MongoDB.

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

Configure Google OAuth before signing in. Create a Google OAuth web client and
use the same client id in the web and API environment files.

`apps/web/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_oauth_client_id.apps.googleusercontent.com
```

`apps/api/.env`:

```env
PORT=3001
MONGODB_URI=mongodb://localhost:27017/ai-stock-advisor
REDIS_URL=redis://localhost:6379
TRADING_AGENT_URL=http://localhost:8000
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
GOOGLE_CLIENT_ID=your_google_oauth_client_id.apps.googleusercontent.com
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=7d
```

In the Google Cloud OAuth client settings, add this authorized JavaScript
origin:

```text
http://localhost:3000
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

Run the API and web app in separate terminals. If either `.env` file changes,
restart the corresponding dev server.

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
| API | `POST` | `http://localhost:3001/auth/google` | Verify Google ID token, create user, return app JWT |
| API | `GET` | `http://localhost:3001/auth/me` | Return the current user for a bearer JWT |
| API | `GET` | `http://localhost:3001/users/me` | Return the current user from the user domain for a bearer JWT |
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

## Authentication

The login page uses Google Identity Services to obtain a Google ID token. The
web app posts that token to the API, the API verifies it against
`GOOGLE_CLIENT_ID`, creates or updates the MongoDB user record, and returns an
application JWT. The browser stores the JWT in local storage and validates it
with `GET /users/me` after page refreshes. Dashboard routes redirect to
`/login` when no valid session is present.

Local browser check:

1. Start MongoDB and Redis with `docker compose up -d`.
2. Start the API with `npm run dev:api`.
3. Start the web app with `npm run dev:web`.
4. Open `http://localhost:3000/login`.
5. Sign in with Google.
6. After login, the app redirects to the protected dashboard at
   `http://localhost:3000`.
7. Refresh the page. The session should remain active.
8. Sign out. Opening `http://localhost:3000` should redirect back to
   `http://localhost:3000/login`.

Verify that a user was created:

```bash
docker compose exec mongodb mongosh ai-stock-advisor \
  --eval 'db.users.find({}, {email: 1, name: 1, avatarUrl: 1, telegramChatId: 1, createdAt: 1, updatedAt: 1}).pretty()'
```

## Environment Variables

The scaffold includes sanitized `.env.example` files. Required API variables
include `MONGODB_URI`, `GOOGLE_CLIENT_ID`, and `JWT_SECRET`. `JWT_EXPIRES_IN`
defaults to `7d` when omitted. The web app requires
`NEXT_PUBLIC_GOOGLE_CLIENT_ID` and `NEXT_PUBLIC_API_URL`. Telegram and Redis
configuration remains reserved for later integrations. Never commit real tokens
or credentials.

Local `.env` files are ignored by git. Before committing, verify that secrets
are not staged:

```bash
git status --short
```

## Troubleshooting

`Google sign-in is not configured.`

Set `NEXT_PUBLIC_GOOGLE_CLIENT_ID` in `apps/web/.env.local`, then restart the
web dev server.

`Invalid Google credential`

Make sure `GOOGLE_CLIENT_ID` in `apps/api/.env` exactly matches
`NEXT_PUBLIC_GOOGLE_CLIENT_ID` in `apps/web/.env.local`, then restart the API.

`MongooseServerSelectionError: connect ECONNREFUSED localhost:27017`

MongoDB is not running. Start local infrastructure:

```bash
docker compose up -d
```

`EADDRINUSE: address already in use :::3000` or `:::3001`

A dev server is already running on that port. Stop the old terminal process or
find it with:

```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN
lsof -nP -iTCP:3001 -sTCP:LISTEN
```

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
