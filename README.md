# AI Stock Advisor

AI Stock Advisor is an MVP monorepo for a stock-analysis web app, NestJS API,
Telegram integration, scheduled jobs, and an isolated TradingAgents service.
The protected home page shows Financial Modeling Prep market movers and links into a
personal watchlist that uses Finnhub for live company data and Yahoo Finance
for historical chart candles. Authenticated users can also manually maintain a
portfolio, review live position values, profit/loss calculations, and allocation
by ticker, and audit recorded portfolio transactions. Google
authentication is wired for the web app and NestJS API, with users stored in
MongoDB.

## Repository Layout

```text
apps/
  web/                    # Next.js app
  api/                    # NestJS API, profiles, watchlist, portfolio, transactions, and market data providers
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
FINNHUB_API_KEY=your_finnhub_api_key
FMP_API_KEY=your_fmp_api_key
TRADING_AGENT_URL=http://localhost:8000
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
GOOGLE_CLIENT_ID=your_google_oauth_client_id.apps.googleusercontent.com
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=7d
# PROFILE_UPLOAD_DIR=uploads/avatars
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

## Local Endpoints

| Service | Method | Endpoint | Purpose |
| --- | --- | --- | --- |
| API | `GET` | `http://localhost:3001/health` | NestJS health check |
| API | `POST` | `http://localhost:3001/auth/google` | Verify Google ID token, create user, return app JWT |
| API | `GET` | `http://localhost:3001/auth/me` | Return the current user for a bearer JWT |
| API | `GET` | `http://localhost:3001/users/me` | Return the current user from the user domain for a bearer JWT |
| API | `GET` | `http://localhost:3001/profile` | Return the authenticated user's profile |
| API | `PATCH` | `http://localhost:3001/profile` | Update the authenticated user's profile |
| API | `POST` | `http://localhost:3001/profile/avatar` | Upload or replace the authenticated user's avatar |
| API | `DELETE` | `http://localhost:3001/profile/avatar` | Delete the authenticated user's avatar |
| API | `GET` | `http://localhost:3001/watchlist` | Return the authenticated user's watchlist |
| API | `POST` | `http://localhost:3001/watchlist` | Add a ticker to the authenticated user's watchlist |
| API | `DELETE` | `http://localhost:3001/watchlist/:id` | Remove one owned watchlist item |
| API | `GET` | `http://localhost:3001/portfolio` | Return aggregated open positions and portfolio summary |
| API | `POST` | `http://localhost:3001/portfolio` | Create one owned portfolio position |
| API | `PATCH` | `http://localhost:3001/portfolio/:id` | Update one owned portfolio position |
| API | `DELETE` | `http://localhost:3001/portfolio/:id` | Remove one owned portfolio position |
| API | `GET` | `http://localhost:3001/transactions?ticker=AAPL&fromDate=2026-05-01&toDate=2026-05-31` | Return owned transaction records with optional filters |
| API | `GET` | `http://localhost:3001/transactions/:id` | Return one owned transaction record |
| API | `POST` | `http://localhost:3001/transactions` | Create one owned transaction record |
| API | `PATCH` | `http://localhost:3001/transactions/:id` | Update one owned transaction record |
| API | `DELETE` | `http://localhost:3001/transactions/:id` | Delete one owned transaction record |
| API | `GET` | `http://localhost:3001/market-data/search?query=apple` | Search Finnhub symbols |
| API | `GET` | `http://localhost:3001/market-data/quote/AAPL` | Return one live Finnhub quote |
| API | `POST` | `http://localhost:3001/market-data/quotes` | Return live Finnhub quotes for `{ "tickers": ["AAPL"] }` |
| API | `GET` | `http://localhost:3001/market-data/company/AAPL` | Return a Finnhub company profile |
| API | `GET` | `http://localhost:3001/market/movers` | Return cached FMP top gainers and losers |
| API | `GET` | `http://localhost:3001/market/stocks/AAPL/details` | Return normalized company and current quote details |
| API | `GET` | `http://localhost:3001/market/stocks/AAPL/candles?range=1m` | Return normalized Yahoo Finance OHLCV candles for `1d`, `1w`, `1m`, or `1y` |
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
with `GET /users/me` after page refreshes. Protected app routes redirect to
`/login` when no valid session is present.

Local browser check:

1. Start MongoDB and Redis with `docker compose up -d`.
2. Start the API with `npm run dev:api`.
3. Start the web app with `npm run dev:web`.
4. Open `http://localhost:3000/login`.
5. Sign in with Google.
6. After login, the app redirects to the protected home page at
   `http://localhost:3000`.
7. Refresh the page. The session should remain active.
8. Sign out. Opening `http://localhost:3000` should redirect back to
   `http://localhost:3000/login`.

Verify that a user was created:

```bash
docker compose exec mongodb mongosh ai-stock-advisor \
  --eval 'db.users.find({}, {email: 1, name: 1, firstName: 1, lastName: 1, nickname: 1, avatarUrl: 1, language: 1, theme: 1, telegramChatId: 1, createdAt: 1, updatedAt: 1}).pretty()'
```

## User Domain

The API keeps user data in MongoDB through the NestJS `UsersModule`.
Google authentication is the current source of user creation: `POST /auth/google`
verifies the Google ID token, then `UsersService.findOrCreateFromGoogle`
creates or updates a user by normalized email.

User documents are stored in the `users` collection with these fields:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `email` | `string` | Yes | Unique, indexed, lowercased, and trimmed. |
| `name` | `string` | Yes | Display name from the Google profile. |
| `firstName` | `string` | No | User-managed first name. |
| `lastName` | `string` | No | User-managed last name. |
| `nickname` | `string` | No | User-managed nickname. |
| `avatarUrl` | `string` | No | Google profile image or local profile upload URL. |
| `language` | `"en" \| "ru" \| "uk"` | Yes | Preferred language. Defaults to English. |
| `theme` | `"light" \| "dark" \| "system"` | No | Preferred application theme. |
| `telegramChatId` | `string` | No | Sparse indexed field reserved for Telegram account linking. |
| `createdAt` | `Date` | Yes | Managed by Mongoose timestamps. |
| `updatedAt` | `Date` | Yes | Managed by Mongoose timestamps. |

`GET /users/me` is the user-domain endpoint for retrieving the authenticated
user. It requires an `Authorization: Bearer <jwt>` header and returns the shared
`UserDto` shape:

```json
{
  "id": "665daec06c456275631b7af1",
  "email": "user@example.com",
  "name": "Example User",
  "firstName": "Example",
  "lastName": "User",
  "nickname": "example-investor",
  "avatarUrl": "/uploads/avatars/2f4354c7-d838-46d1-984c-c066677e54d8.png",
  "language": "en",
  "theme": "system",
  "telegramChatId": "123456789",
  "createdAt": "2026-06-02T09:00:00.000Z",
  "updatedAt": "2026-06-02T09:00:00.000Z"
}
```

Optional fields are omitted when they are not set.

## User Profile

Authenticated users can manage their profile at `http://localhost:3000/profile`.
The page uses TanStack Query for loading and mutations, and updates the active
theme immediately after a saved preference changes. Users can switch the
interface between English, Russian, and Ukrainian from the header or profile
page. Language changes are saved immediately through `PATCH /profile`, applied
after the API confirms the update, and restored from the saved user profile
after login. The compact authenticated header exposes flag-based language
selection, icon-based theme selection, the profile avatar, and a burger menu
with application navigation. Header theme changes are also persisted
immediately through `PATCH /profile`. The burger menu contains Home page,
Portfolio, Transactions, Watchlist, and Sign out. The MVP redirects
`/dashboard` to the authenticated home page at `/`.

For the MVP, uploaded profile photos are written to the API filesystem under
`uploads/avatars` and served from `/uploads/avatars`. The folder is ignored by
git. Set the optional `PROFILE_UPLOAD_DIR` API environment variable to use
another writable local directory. JPEG, PNG, and WebP files up to 5 MB are
accepted. External storage credentials are not required.

Local browser check:

1. Sign in through `http://localhost:3000/login`.
2. Open `http://localhost:3000/profile`.
3. Change the language and confirm that the visible interface updates immediately.
4. Refresh the page and confirm that the saved language remains active.
5. Update the personal information and theme, then save.
6. Upload a profile image and refresh the page. The image and form values should persist.
7. Delete the profile image. The fallback initials avatar should be shown.

## Watchlist

Authenticated users can manage a persistent MongoDB-backed stock watchlist from
the web app at `http://localhost:3000/watchlist`. The page uses the stored app
JWT and calls the API with an `Authorization: Bearer <jwt>` header. The
home page links to this protected page.

Watchlist items are stored with `userId`, uppercase `ticker`, optional
`companyName`, `createdAt`, and `updatedAt`. Duplicate tickers are rejected per
user, and deletes only match items owned by the authenticated user. Ticker
input is trimmed, converted to uppercase, and validated before persistence.

The watchlist renders tracked companies as responsive fintech-style cards.
Each card shows a circular Finnhub company logo when available, or circular
fallback initials when a logo is missing. Cards display the ticker, company
name, current price, absolute price change, and percentage change with
positive, negative, and neutral color states. Selecting the main card area
opens a stock details modal with the latest quote values and a responsive
historical closing-price chart. The chart supports `1D`, `1W`, `1M`, and `1Y`
ranges backed by Yahoo Finance, with loading, empty, and safe provider-error
states. The remove action is kept separate so deleting a ticker does not open
the modal.

Example add request:

```bash
curl -X POST http://localhost:3001/watchlist \
  -H 'authorization: Bearer your_app_jwt' \
  -H 'content-type: application/json' \
  -d '{"ticker":"aapl"}'
```

Local browser check:

1. Sign in through `http://localhost:3000/login`.
2. Open `http://localhost:3000/watchlist` from the header navigation.
3. Search for `apple` or `AAPL`, then select Apple from the autocomplete list.
4. Add the selected stock. Its card should show a company logo or fallback initials, company name, current market price, and colored price change.
5. Select the stock card. A stock details modal should open with the latest quote values and a historical chart.
6. Select each chart range and confirm that the chart reloads and uses a green, red, or gray line based on the selected period trend.
7. Close the modal and refresh the page. The ticker should remain in the list with its latest quote.
8. Try to add `AAPL` again. The page should show a duplicate-ticker error.
9. Remove the ticker. It should disappear without opening the details modal.

## Portfolio

Authenticated users can review aggregated open positions at
`http://localhost:3000/portfolio`. Open the page from the authenticated header
menu. The page uses TanStack Query, shows portfolio summary cards, renders a
responsive allocation pie chart, and renders one table row per open ticker.
Detailed purchase, sale, adjustment, and delete records remain on the
Transactions page.

The portfolio summary and positions returned by `GET /portfolio` are derived
from owned transaction records, not from individual purchase rows. Multiple
`BUY` transactions for the same ticker are aggregated into one position.
`SELL` quantities reduce open quantity and remaining cost basis. Tickers with
`totalQuantity <= 0` are omitted. Average purchase price is the weighted average
buy price applied to the remaining open quantity. `UPDATE` and `DELETE`
transaction records are preserved in transaction history but are not included in
portfolio aggregation.

The allocation pie chart uses the same aggregated open positions as the
positions table, not individual transactions. Each segment represents one ticker
and is calculated as:

```text
allocationPercent = position.currentValue / summary.totalCurrentValue * 100
```

The chart legend displays ticker, company name when available, allocation
percentage, and current value. It supports loading, empty, and API error states.
When the portfolio has no open positions or total current value is zero, the
chart shows an empty state instead of rendering segments.

`GET /portfolio` loads the latest cached Finnhub quote for each open ticker and
returns:

```json
{
  "summary": {
    "totalCostBasis": 300,
    "totalCurrentValue": 360,
    "totalProfitLoss": 60,
    "totalProfitLossPercent": 20,
    "totalStocksCount": 2,
    "positionsCount": 1
  },
  "positions": [
    {
      "ticker": "AAPL",
      "companyName": "Apple Inc.",
      "quantity": 2,
      "averagePurchasePrice": 150,
      "currentPrice": 180,
      "costBasis": 300,
      "currentValue": 360,
      "profitLoss": 60,
      "profitLossPercent": 20,
      "currency": "USD"
    }
  ]
}
```

The MVP does not perform FX conversion. Keep positions in one currency when
using aggregate summary values.

Example add request:

```bash
curl -X POST http://localhost:3001/portfolio \
  -H 'authorization: Bearer your_app_jwt' \
  -H 'content-type: application/json' \
  -d '{"ticker":"AAPL","companyName":"Apple Inc.","quantity":2,"averagePurchasePrice":150,"currency":"USD","purchaseDate":"2026-05-01T10:30:00.000Z"}'
```

Local browser check:

1. Sign in and open `http://localhost:3000/portfolio`.
2. Select Add position, search for `AAPL`, and choose Apple from autocomplete.
3. Confirm that the current market price and current local date-time are prefilled.
4. Enter a positive quantity and adjust the purchase price or timestamp if needed. Future timestamps must be rejected.
5. Save a second `AAPL` purchase with a different price and time. Portfolio should still show one `AAPL` row with aggregated quantity and weighted average purchase price.
6. Confirm that the allocation chart shows one `AAPL` segment and the legend percentage is approximately `100%`.
7. Add another ticker purchase. Confirm that the allocation chart shows one segment per ticker and the displayed percentages add up to approximately `100%`.
8. Add an `AAPL` `SELL` transaction through the Transactions API. Confirm that Portfolio quantity, cost basis, and allocation percentage update.
9. Fully sell the remaining `AAPL` quantity. Confirm that `AAPL` disappears from Portfolio and from the allocation chart.
10. Refresh the page and confirm that the aggregated portfolio state persists.

## Transactions

Authenticated users can review transaction history at
`http://localhost:3000/transactions`. The page lists owned transaction records,
supports ticker search and date range filters, and provides edit/delete actions
for transaction records. Because Portfolio is derived from transaction history,
transaction record edits can change the aggregated Portfolio view.

Transaction records are stored with `userId`, uppercase `ticker`,
`companyName`, `type` (`BUY`, `SELL`, `UPDATE`, or `DELETE`), positive
`quantity`, positive `price`, three-letter `currency`, `transactionDate`,
optional `notes`, `createdAt`, and `updatedAt`. All transaction endpoints
require `Authorization: Bearer <jwt>` and only read, update, or delete records
owned by the authenticated user. Date-only `toDate` filters include the full
selected UTC day.

Example manual transaction request:

```bash
curl -X POST http://localhost:3001/transactions \
  -H 'authorization: Bearer your_app_jwt' \
  -H 'content-type: application/json' \
  -d '{"ticker":"AAPL","companyName":"Apple Inc.","type":"SELL","quantity":1,"price":190,"currency":"USD","transactionDate":"2026-05-15T14:30:00.000Z","notes":"Trimmed position"}'
```

Local browser check:

1. Sign in and open `http://localhost:3000/portfolio`.
2. Add a portfolio purchase.
3. Open `http://localhost:3000/transactions` from the header navigation.
4. Confirm the corresponding `BUY` record is listed.
5. Filter by ticker and date range, then clear filters.
6. Create a `SELL` transaction through the API or edit an existing transaction to `SELL`, then confirm the Portfolio page reflects the changed open quantity.

## Market Data

`MarketDataModule` separates live market data from historical chart data:

| Provider | Responsibility |
| --- | --- |
| Finnhub | Symbol search, company profiles, and current quotes |
| Financial Modeling Prep | Home page top gainers and losers |
| Yahoo Finance through `yahoo-finance2` | Historical OHLCV candles for stock charts |

Finnhub is exposed behind the provider-neutral `MarketDataProvider` interface.
Historical chart candles use `YahooFinanceProvider` through the separate
`HistoricalMarketDataProvider` interface. Installing root Node dependencies
with `npm install` installs `yahoo-finance2`; Yahoo Finance does not require an
additional API key. `yahoo-finance2` uses Yahoo Finance's unofficial API, so
historical data availability still depends on the upstream service.

Historical candle ranges map to Yahoo Finance chart queries as follows:

| UI range | Yahoo period | Yahoo interval |
| --- | --- | --- |
| `1D` | `1d` | `5m` |
| `1W` | `7d` | `1h` |
| `1M` | `1mo` | `1d` |
| `1Y` | `1y` | `1wk` |

The current implementation uses an in-memory TTL cache because Redis
application wiring has not been added yet:

| Data | Cache TTL |
| --- | --- |
| Quotes | 2 minutes |
| Company profiles | 24 hours |
| Symbol searches | 1 hour |
| FMP market movers | 5 minutes |
| Historical candles | 5 minutes |

The cache is process-local and resets when the API restarts. Replace it with a
Redis-backed implementation when BullMQ or shared Redis integration is added.
Finnhub, FMP, and Yahoo Finance requests time out after 5 seconds. API failures
return user-friendly errors without exposing provider details. Yahoo Finance
chart responses are normalized into OHLCV candles, and incomplete points are
omitted instead of being replaced with placeholder financial values.

`GET /market/movers` requires the application JWT and returns up to ten FMP
gainers and losers from the stable `biggest-gainers` and `biggest-losers`
endpoints. Percentage strings such as `"12.34%"` are normalized to numbers,
invalid records are omitted, and the response includes an ISO `updatedAt`
timestamp. The FMP API key is read from `FMP_API_KEY`; when it is missing or FMP
cannot be reached, the endpoint returns a controlled `503`.

FMP deprecated the legacy `/api/v3/stock_market/gainers` and
`/api/v3/stock_market/losers` endpoints for new subscriptions. Use only the
stable endpoints:

| List | FMP endpoint |
| --- | --- |
| Top gainers | `GET https://financialmodelingprep.com/stable/biggest-gainers?apikey=...` |
| Top losers | `GET https://financialmodelingprep.com/stable/biggest-losers?apikey=...` |

Example application API request:

```bash
curl http://localhost:3001/market/movers \
  -H 'authorization: Bearer your_app_jwt'
```

```json
{
  "gainers": [
    {
      "symbol": "AAPL",
      "name": "Apple Inc.",
      "price": 210.42,
      "change": 5.23,
      "changesPercentage": 2.55
    }
  ],
  "losers": [
    {
      "symbol": "MSFT",
      "name": "Microsoft Corporation",
      "price": 420.1,
      "change": -6.1,
      "changesPercentage": -1.43
    }
  ],
  "updatedAt": "2026-06-02T09:00:00.000Z"
}
```

The home page requests this endpoint through TanStack Query and renders
separate Top Gainers and Top Losers lists. It shows loading skeletons while the
request is pending, an empty state when FMP returns no valid records, and a
safe error state when the provider request fails.

`GET /market/stocks/:symbol/candles?range=1d|1w|1m|1y` requires the application
JWT and returns:

```bash
curl http://localhost:3001/market/stocks/AAPL/candles?range=1d \
  -H 'authorization: Bearer your_app_jwt'
```

```json
{
  "symbol": "AAPL",
  "range": "1d",
  "candles": [
    {
      "timestamp": 1780401600,
      "open": 208,
      "high": 209,
      "low": 207.5,
      "close": 208.5,
      "volume": 10000
    }
  ]
}
```

`timestamp` is a Unix timestamp in seconds. The web API adapter converts it to
an ISO timestamp before passing candles into the chart component. Invalid
symbols return `404`. Temporary Yahoo Finance failures and request timeouts
return `503`.

## Environment Variables

The scaffold includes sanitized `.env.example` files. Required API variables
include `MONGODB_URI`, `GOOGLE_CLIENT_ID`, `JWT_SECRET`, and `FINNHUB_API_KEY`.
Set `FMP_API_KEY` to load home page market movers. `JWT_EXPIRES_IN` defaults to
`7d` when omitted. `PROFILE_UPLOAD_DIR` optionally changes the writable local
avatar directory. The web app requires `NEXT_PUBLIC_GOOGLE_CLIENT_ID` and
`NEXT_PUBLIC_API_URL`. Telegram and Redis configuration remains reserved for
later integrations. Create Finnhub and Financial Modeling Prep API keys and
keep them only in `apps/api/.env`. Never commit real tokens or credentials.

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

`Historical prices are temporarily unavailable.`

The stock details modal could not load Yahoo Finance chart data. Confirm that
the API can reach Yahoo Finance, then restart the API if dependencies were
installed while it was already running:

```bash
npm install
npm run dev:api
```

`No historical prices are available for this range.`

Yahoo Finance returned no complete OHLCV points for the selected symbol and
range. The chart intentionally does not generate placeholder financial data.

`Market movers are temporarily unavailable.`

Confirm that `FMP_API_KEY` is set in `apps/api/.env`, then restart the API. The
implementation uses the current FMP `/stable/biggest-gainers` and
`/stable/biggest-losers` endpoints. A `403` response mentioning a legacy
endpoint usually means an older `/api/v3/stock_market/*` URL is still in use.

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

## TODO Plan

The next product work is planned in this order:

- [x] Portfolio purchase creation
- [x] Portfolio aggregated positions
- [x] Portfolio P/L calculation
- [x] Portfolio Dashboard
- [x] Portfolio allocation pie chart
- [x] Stock Details Page
- [x] Improve Search
- [ ] AI Stock Report
- [ ] News + AI Summary
- [ ] Telegram Bot
- [ ] Price Alerts
- [ ] CSV Import
- [ ] Revolut / IBKR sync
- [ ] Email/password + 2FA

## Quality Commands

```bash
npm run lint
npm run type-check
npm run test
npm run build
```

## Deployment

AWS deployment is intentionally deferred until the MVP behavior is established.
