# AI Stock Advisor

AI Stock Advisor is an MVP monorepo for a stock-analysis web app, NestJS API,
Telegram integration, scheduled jobs, and an isolated TradingAgents service.
The protected home page shows Financial Modeling Prep market movers, popular
stock shortcuts, and links into a personal watchlist that uses Finnhub for live
company data and Yahoo Finance for historical chart candles. Authenticated users
can also manually maintain a portfolio, review live position values, profit/loss
calculations, allocation by ticker, and recorded portfolio transactions. Google
authentication is wired for the web app and NestJS API, with users stored in
MongoDB. Users can also create an email/password account from the sign-up form
with an optional phone number and log in with email, nickname, or phone number
plus password; the API stores only a password hash and returns the same app JWT
session shape used by Google login.

## Repository Layout

```text
apps/
  web/                    # Next.js app
  api/                    # NestJS API, profiles, watchlist, portfolio, transactions, and market data providers
packages/
  shared/                 # Shared TypeScript request/response types and phone normalization utilities
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

The root dev scripts build the shared TypeScript package before starting the
selected app. Run the API and web app in separate terminals. If either `.env`
file changes, restart the corresponding dev server.

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
| API | `POST` | `http://localhost:3001/auth/register` | Create an email/password user with an optional phone number, hash the password, and return the common auth response |
| API | `POST` | `http://localhost:3001/auth/login` | Log in with email, nickname, or phone number plus password and return the common auth response |
| API | `GET` | `http://localhost:3001/auth/me` | Return the current user for a bearer JWT |
| API | `GET` | `http://localhost:3001/users/me` | Return the current user from the user domain for a bearer JWT |
| API | `GET` | `http://localhost:3001/profile` | Return the authenticated user's profile |
| API | `PATCH` | `http://localhost:3001/profile` | Update the authenticated user's profile |
| API | `POST` | `http://localhost:3001/profile/avatar` | Upload or replace the authenticated user's avatar |
| API | `DELETE` | `http://localhost:3001/profile/avatar` | Delete the authenticated user's avatar |
| API | `GET` | `http://localhost:3001/watchlist` | Return the authenticated user's watchlist |
| API | `POST` | `http://localhost:3001/watchlist` | Add a ticker to the authenticated user's watchlist |
| API | `DELETE` | `http://localhost:3001/watchlist/:id` | Remove one owned watchlist item |
| API | `GET` | `http://localhost:3001/portfolio?page=1&limit=10` | Return paginated aggregated open positions and portfolio summary |
| API | `GET` | `http://localhost:3001/portfolio/allocation` | Return full-portfolio allocation data independent of pagination |
| API | `GET` | `http://localhost:3001/portfolio/performance?range=1M` | Return historical portfolio value, deposited capital, gain, and return points for `1D`, `1W`, `1M`, `3M`, `6M`, `1Y`, `5Y`, or `ALL` |
| API | `POST` | `http://localhost:3001/portfolio` | Create one owned portfolio position |
| API | `PATCH` | `http://localhost:3001/portfolio/:id` | Update one owned portfolio position |
| API | `DELETE` | `http://localhost:3001/portfolio/:id` | Remove one owned portfolio position |
| API | `GET` | `http://localhost:3001/transactions?page=1&limit=10&ticker=AAPL&type=BUY&fromDate=2026-05-01&toDate=2026-05-31` | Return paginated owned transaction records with optional filters |
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

`GET /portfolio` and `GET /transactions` accept `page` and `limit` query
parameters. Defaults are `page=1` and `limit=10`; `limit` cannot exceed `100`.
Both endpoints return `{ items, meta }`, where `meta` includes `totalItems`,
`totalPages`, `hasNextPage`, and `hasPreviousPage`. Portfolio also includes the
full portfolio `summary`; pagination is applied after transaction aggregation.
`GET /portfolio/allocation` does not accept pagination and always calculates
allocation from every open position for the authenticated user.
Transaction pagination metadata is calculated after active `ticker`, `type`,
`fromDate`, and `toDate` filters are applied.

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
application JWT. The sign-up mode also supports email/password registration
through `POST /auth/register` with `email`, `nickname`, optional `phoneNumber`,
and `password`; the API normalizes email, nickname, and phone number, stores a
secure password hash, sets `authProviders.email = true`, sets
`authProviders.phone = true` only when a phone number is provided, and returns
the same common auth response. Phone numbers are stored in E.164 format, for
example `+48500111222`, and are unique when present.
Registered email users can log in through `POST /auth/login` with
`identifier` and `password`; `identifier` may be the normalized email,
nickname, or phone number. Phone login is password-based only. SMS providers,
OTP codes, phone verification, 2FA, password reset, and email verification are
not implemented yet.

The browser stores the JWT in local storage and validates it with
`GET /users/me` after page refreshes. Protected app routes redirect to `/login`
when no valid session is present.

Local browser check:

1. Start MongoDB and Redis with `docker compose up -d`.
2. Start the API with `npm run dev:api`.
3. Start the web app with `npm run dev:web`.
4. Open `http://localhost:3000/login`.
5. Sign in with Google, log in with email, nickname, or phone number plus
   password, or switch to Sign up and create an email/password account with an
   optional phone number.
6. After authentication, the app redirects to the protected home page at
   `http://localhost:3000`.
7. Refresh the page. The session should remain active.
8. Sign out. Opening `http://localhost:3000` should redirect back to
   `http://localhost:3000/login`.

Verify that a user was created:

```bash
docker compose exec mongodb mongosh ai-stock-advisor \
  --eval 'db.users.find({}, {email: 1, name: 1, firstName: 1, lastName: 1, nickname: 1, phoneNumber: 1, phoneVerified: 1, avatarUrl: 1, language: 1, theme: 1, telegramChatId: 1, createdAt: 1, updatedAt: 1}).pretty()'
```

## User Domain

The API keeps user data in MongoDB through the NestJS `UsersModule`.
Google authentication creates or updates users through `POST /auth/google`.
Email/password registration creates users through `POST /auth/register`; those
users log in through `POST /auth/login` with email, nickname, or phone number
plus password.

User documents are stored in the `users` collection with these fields:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `email` | `string` | No | Unique, indexed, lowercased, and trimmed when present. |
| `name` | `string` | No | Display name from the Google profile; email users fall back to nickname/email for display. |
| `firstName` | `string` | No | User-managed first name. |
| `lastName` | `string` | No | User-managed last name. |
| `nickname` | `string` | No | User-managed nickname. |
| `phoneNumber` | `string` | No | Unique sparse field stored in E.164 format when present. |
| `phoneVerified` | `boolean` | Yes | Defaults to `false`; phone verification is not implemented yet. |
| `avatarUrl` | `string` | No | Google profile image or local profile upload URL. |
| `passwordHash` | `string` | No | Stored only for email users and excluded from API responses. |
| `authProviders` | `object` | Yes | Provider flags for Google, email, Apple, Facebook, and phone. |
| `language` | `"en" \| "ru" \| "uk"` | Yes | Preferred language. Defaults to English. |
| `theme` | `"light" \| "dark" \| "system"` | No | Preferred application theme. |
| `watchlistViewMode` | `"grid" \| "list"` | Yes | Preferred Watchlist display mode. Defaults to grid. |
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
  "phoneNumber": "+48500111222",
  "phoneVerified": false,
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
theme immediately after a saved preference changes. Users can add, edit, or
clear a phone number from the profile page; saved phone numbers are normalized
to E.164 and displayed with `Not verified` status because phone verification is
not part of the MVP yet. Users can switch the interface between English,
Russian, and Ukrainian from the header or profile page. Language changes are
saved immediately through `PATCH /profile`, applied after the API confirms the
update, and restored from the saved user profile after login. The compact
authenticated header exposes flag-based language selection, icon-based theme
selection, the profile avatar, and a burger menu with application navigation.
Header theme changes are also persisted immediately through `PATCH /profile`.
The burger menu contains Home page, Portfolio, Transactions, Watchlist, and Sign
out. The MVP redirects
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

The watchlist renders tracked companies in a user-selectable Grid or List
view. The selected `watchlistViewMode` is saved on the user profile through
`PATCH /profile` and restored when the page is reopened. Grid view uses
responsive fixed columns: three cards per row on desktop, two on tablet, and
one on mobile, so a single card keeps one desktop column width instead of
stretching across the full row. List view renders the same filtered and sorted
items in a compact table without charts.

Grid cards use the existing responsive fintech-style card design.
Each card shows a circular Finnhub company logo when available, or circular
fallback initials when a logo is missing. Cards display the ticker, company
name, current price, absolute price change, and percentage change with
positive, negative, and neutral color states. Cards also show a small
non-interactive sparkline from `1Y` historical candles, with loading, empty,
and provider-error fallbacks when chart data is unavailable. Selecting
the main card area opens a tabbed stock details modal. The modal keeps the
company logo, name, ticker, exchange, currency, icon-only watchlist, purchase,
transactions, and close actions visible in a sticky header. Details are split
into Chart, Stock Info, and Company Info tabs so the content area scrolls
independently inside the modal. The chart supports `1D`, `1W`, `1M`, `3M`,
`6M`, `1Y`, `5Y`, and `ALL` ranges backed by Yahoo Finance, with loading,
empty, and safe provider-error states. Selecting the purchase action closes the
stock details modal and opens the add-purchase modal as a separate top-level
dialog instead of nesting one modal inside another. Removing a ticker from
either Grid or List view opens a confirmation dialog before deletion.

The authenticated home page includes a compact Market Movers section backed by
the existing `GET /market/movers` API. Top Gainers and Top Losers are shown in
keyboard-accessible tabs, with 10 rounded stock cards per tab. Each card
focuses on the ticker and percentage move, uses green/up styling for gainers
and red/down styling for losers, and opens the existing stock details modal.
Mover cards reuse the company logo component and enrich visible logos through
the existing company profile endpoint when available. Loading uses stable
skeleton cards, and API errors or empty results stay contained inside the
Market Movers section.

Watchlist filtering, sorting, and pagination are client-side. The page supports
searching the saved watchlist by ticker or company name, sorting by ticker,
current price, daily change percentage, and company name, and paginating the
filtered result. Search, sort, order, and page state are stored in URL query
parameters, for example
`/watchlist?search=apple&sort=changePercent&order=desc&page=1`. Empty and
default values are omitted where possible; opening the page without query
parameters keeps the default saved-watchlist order and starts on page 1. Search
is applied first, then sorting, then pagination. The URL state survives refresh
and supports browser back/forward navigation and bookmarks.

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
5. Select the stock card. A stock details modal should open on the Chart tab with a sticky header and tab bar.
6. Select each chart range and confirm that the chart reloads and uses a green, red, or gray line based on the selected period trend.
7. Switch to Stock Info and Company Info. The selected ticker should remain unchanged, and unavailable company profile fields should show `N/A`.
8. Use the add-purchase icon. The stock details modal should close, and the add-purchase modal should open as its own top-level dialog.
9. Close the modal and refresh the page. The ticker should remain in the list with its latest quote.
10. Try to add `AAPL` again. The page should show a duplicate-ticker error.
11. Search the saved watchlist, change sorting, switch pages if enough items exist, then refresh the page. The URL state should restore the same visible list state.
12. Remove the ticker. It should disappear without opening the details modal.

## Portfolio

Authenticated users can review aggregated open positions at
`http://localhost:3000/portfolio`. Open the page from the authenticated header
menu. The page uses TanStack Query, shows portfolio summary cards, renders a
responsive portfolio performance chart, renders a responsive allocation pie
chart, and renders one table row per open ticker. Detailed purchase, sale,
adjustment, and delete records remain on the Transactions page.
The summary cards include total value, total cost, total profit/loss, total
return percentage, number of positions, and total stocks. Total return is based
on the displayed total value and total cost.

The Portfolio page is organized into URL-backed tabs with a compact sticky
navigation bar below the hero header. Supported tab URLs are
`/portfolio?tab=overview`, `/portfolio?tab=performance`,
`/portfolio?tab=positions`, and `/portfolio?tab=analytics`. The Overview tab
contains summary cards, allocation, and portfolio insights. Performance contains
the performance chart plus deposited capital, current value, investment gain,
and total return metrics. Positions contains search, position actions, the
positions table, sorting, and pagination. Analytics currently shows an
empty-state placeholder for future advanced analytics. Empty-state UI is shared
across portfolio tabs: empty portfolios show an "Add First Position" action
that opens the add-purchase modal, performance history shows snapshot-specific
empty copy, and search misses show search-specific guidance instead of the
generic portfolio empty state.

The portfolio summary and positions returned by `GET /portfolio` are derived
from owned transaction records, not from individual purchase rows. Multiple
`BUY` transactions for the same ticker are aggregated into one position.
`SELL` quantities reduce open quantity and remaining cost basis. Tickers with
`totalQuantity <= 0` are omitted. Average purchase price is the weighted average
buy price applied to the remaining open quantity. `UPDATE` and `DELETE`
transaction records are preserved in transaction history but are not included in
portfolio aggregation.

The allocation pie chart uses `GET /portfolio/allocation`, not the paginated
positions table response. It stays stable when users navigate table pages. Each
segment represents one ticker and is calculated as:

```text
allocationPercent = position.currentValue / totalPortfolioValue * 100
```

The allocation endpoint sorts open positions by current value descending,
returns the top 10 positions individually, and aggregates any remaining
positions into an `Others` item. If there are 10 or fewer open positions,
`Others` is not returned. The chart legend displays ticker, allocation
percentage, and current value. It supports loading, empty, and API error states.
When the portfolio has no open positions or total current value is zero, the
chart shows an empty state instead of rendering segments.

The performance chart uses `GET /portfolio/performance?range=1M`. Supported
ranges are `1D`, `1W`, `1M`, `3M`, `6M`, `1Y`, `5Y`, and `ALL`; the web UI
defaults to `1M`. `1D` uses latest available intraday candles when Yahoo
provides them, grouped into date points, plus the live current-value point. It
does not fabricate intraday portfolio points. `1W` uses the last seven calendar
days of available market candles, with non-trading days represented only when
the provider has data. `5Y` uses the last five years of available history.
Each point represents both current open-position market value and the deposited
capital still allocated to open positions:

```text
portfolioValue = sum(openPositionQuantityOnDate * historicalClosePriceOnDate)
depositedCapital = sum(openPositionQuantityOnDate * weightedAverageBuyPriceOnDate)
investmentGain = portfolioValue - depositedCapital
totalReturnPercent = investmentGain / depositedCapital * 100
```

`SELL` transactions reduce open quantity and therefore reduce remaining
deposited capital proportionally. They do not add to deposited capital.

The API returns a compact chart response:

```json
[
  {
    "date": "2026-05-01",
    "depositedCapital": 6370.89,
    "portfolioValue": 7120.05,
    "totalValue": 7120.05,
    "totalProfit": 749.16,
    "totalReturnPercent": 11.76,
    "positionCount": 4
  },
  {
    "date": "2026-05-02",
    "depositedCapital": 6370.89,
    "portfolioValue": 7188.42,
    "totalValue": 7188.42,
    "totalProfit": 817.53,
    "totalReturnPercent": 12.83,
    "positionCount": 4
  }
]
```

Historical values are persisted in `PortfolioSnapshot` documents with
`userId`, `snapshotDate`, `depositedCapital`, `portfolioValue`, `totalProfit`,
`totalReturnPercent`, and `positionCount`. Legacy `totalValue` and `totalCost`
fields are also populated for compatibility. A unique `{ userId, snapshotDate }`
index keeps one snapshot per user per day. The performance endpoint recalculates
the requested range from the latest owned transactions and Yahoo historical
candles on each request, then idempotently upserts those snapshots. The last
point is always recalculated from current live quotes so new purchases, sells,
transaction edits, and transaction deletes are reflected after the frontend
invalidates the `["portfolio", "performance"]` TanStack Query key. This keeps
the frontend from doing temporary portfolio math and creates a reusable
foundation for daily P/L, benchmark comparison, CAGR, Telegram digests, AI
reports, and portfolio insights.

The Portfolio Insights section appears in the Overview tab below the summary
and allocation content. It reuses aggregated open positions from `GET /portfolio`
to show the best performer, worst performer, and largest position in one compact
card grid. Best performer only considers positions with valid quantity, current
value, cost basis, purchase price, and positive profit percentage. Worst
performer only considers valid positions with negative profit percentage, so
flat `0.00%` positions are ignored. If no winning or losing position exists,
the corresponding card shows an explicit empty state instead of selecting a
misleading position. Largest position uses the same allocation formula as the
allocation chart:

```text
largestPositionPercent = position.currentValue / totalPortfolioValue * 100
```

Today's P/L uses `GET /portfolio/performance?range=1D` and compares the latest
value point with the previous trading-day point. If that comparison is
unavailable, the card shows `N/A` with an explanatory tooltip. The section shows
current value for position-based insight cards, opens the stock details modal
when those cards are clicked, supports loading skeletons, and responsive
4-column, 2-column, and single-column layouts. When the portfolio has no open
positions, the Overview tab shows the portfolio empty state and does not render
allocation or insights content.

The positions table supports client-side search by ticker or company name and
sorting by name, quantity, current stock price, current value, profit/loss USD,
and profit/loss percentage. Search is applied first, then sorting, then local
table pagination. Search, sort, order, and page state are stored in URL query
parameters, for example
`/portfolio?tab=positions&search=aapl&sort=currentValue&order=desc&page=2`.
Empty and default table values are omitted where possible; opening the page
without query parameters selects the Overview tab, keeps the default
aggregated-position order, and starts on page 1. The URL state survives refresh
and supports browser back/forward navigation and bookmarks.

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

Add purchase validation runs in both the web form and API DTOs. Users must pick
a ticker from autocomplete, quantity and purchase price must be positive decimal
values between `0.0001` and `100000000`, using `.` or `,` as the decimal
separator when entered as text. Currency is currently limited to `USD`, and
purchase dates cannot be in the future. Notes are optional, capped at 500
characters, normalized for line endings, and rejected if they contain HTML,
script-like payloads, or control characters. Successful saves close the modal
and refresh both Portfolio and Transactions query data.

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
10. Add enough tickers to paginate the positions table, search or sort the table, switch pages, and confirm that the allocation chart does not change because of pagination.
11. Refresh the page and confirm that the aggregated portfolio state and URL-backed table state persist.

## Transactions

Authenticated users can review transaction history at
`http://localhost:3000/transactions`. The page lists owned transaction records,
supports ticker search, type, and date range filters, and provides edit/delete
actions for transaction records. Because Portfolio is derived from transaction
history, transaction record edits can change the aggregated Portfolio view.

The transactions table supports client-side sorting by ticker, type, quantity,
price, and transaction date. Ticker, type, and date filters are applied first,
then sorting, then local table pagination. Ticker, type, date filters, sort,
order, and page state are stored in URL query parameters, for example
`/transactions?ticker=aapl&type=buy&sort=date&order=desc&page=1`. Empty and
default values are omitted where possible; opening the page without query
parameters starts with no filters, default ordering, and page 1. The URL state
survives refresh and supports browser back/forward navigation and bookmarks.

Transaction records are stored with `userId`, uppercase `ticker`,
`companyName`, `type` (`BUY`, `SELL`, `UPDATE`, or `DELETE`), positive
`quantity`, positive `price`, three-letter `currency`, `transactionDate`,
optional `notes`, `createdAt`, and `updatedAt`. Create and update transaction
requests accept only `BUY` or `SELL`, while `UPDATE` and `DELETE` remain
internal audit record types. Quantity and price validation accepts positive
decimal values between `0.0001` and `100000000`, using `.` or `,` as the
decimal separator when entered as text. All transaction endpoints require
`Authorization: Bearer <jwt>` and only read, update, or delete records owned by
the authenticated user. Date-only `toDate` filters include the full selected UTC
day.

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
5. Filter by ticker, transaction type, and date range, then clear filters.
6. Change filters, sorting, and page, then refresh the page. The URL state should restore the same visible table state.
7. Create a `SELL` transaction through the API or edit an existing transaction to `SELL`, then confirm the Portfolio page reflects the changed open quantity.

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
| `3M` | `3mo` | `1d` |
| `6M` | `6mo` | `1d` |
| `1Y` | `1y` | `1d` |
| `5Y` | `5y` | `1wk` |
| `ALL` | full available history | `1wk` |

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

`GET /market/stocks/:symbol/candles?range=1d|1w|1m|3m|6m|1y|5y|all` requires
the application JWT and returns:

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

The API currently has lightweight in-process portfolio snapshot scheduling.
At 23:45 UTC it scans users with portfolio transactions and writes one
`PortfolioSnapshot` per user for the current UTC day using live quotes and
current aggregated positions. BullMQ remains the intended production job runner;
Redis is included in Docker Compose so this scheduler can move to retryable,
typed BullMQ jobs without changing local infrastructure.

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
