# AI Stock Advisor

## Project Overview

AI Stock Advisor — персональная платформа для анализа фондового рынка и управления инвестиционным портфелем.

Основные цели проекта:

* Отслеживание собственного инвестиционного портфеля.
* Управление списком интересующих компаний (Watchlist).
* Получение AI-аналитики по выбранным акциям.
* Автоматический поиск новых инвестиционных возможностей.
* Получение уведомлений и отчетов через Telegram.
* Интеграция с TradingAgents для многоагентного анализа рынка.

---

# Technology Stack

Frontend:

* Next.js 15
* TypeScript
* Tailwind CSS
* shadcn/ui

Backend:

* NestJS
* TypeScript

Market Data:

* Finnhub for symbol search, company profiles, and current quotes
* Financial Modeling Prep stable API for dashboard top gainers and losers
* Yahoo Finance through `yahoo-finance2` for historical OHLCV chart candles

Database:

* MongoDB

Infrastructure:

* Redis
* BullMQ
* Docker
* AWS (future)

AI:

* TradingAgents
* OpenAI Models

Notifications:

* Telegram Bot

---

# Current Architecture

Monorepo structure:

apps/

* web
* api

packages/

* shared

services/

* trading-agent

Infrastructure:

* docker-compose

    * MongoDB
    * Redis

---

# Work Completed

Initial project skeleton has been successfully created.

Completed tasks:

* Monorepo structure initialized.
* Frontend application scaffolded.
* Backend application scaffolded.
* Shared package structure created.
* Trading Agent service placeholder created.
* Docker Compose configured.
* MongoDB container configured.
* Redis container configured.
* Environment configuration prepared.
* Root workspace scripts configured.
* TypeScript configuration verified.
* README documentation created.
* Build pipeline validated.
* Lint pipeline validated.
* Test pipeline validated.
* Google authentication implemented.
* Login page added.
* Protected dashboard route added.
* Browser session persistence added through JWT local storage and `/users/me`.
* API Google ID token validation added.
* API JWT generation added.
* MongoDB user creation/update from Google authentication added.
* User domain added with `UsersModule`, `UsersService`, `UsersController`, and `GET /users/me`.
* User schema added with `email`, `name`, `avatarUrl`, optional `telegramChatId`, `createdAt`, and `updatedAt`.
* Persistent MongoDB-backed Watchlist domain added with `WatchlistModule`, `WatchlistService`, and `WatchlistController`.
* Authenticated Watchlist API added with `GET /watchlist`, `POST /watchlist`, and `DELETE /watchlist/:id`.
* Watchlist schema added with per-user ownership, ticker normalization, optional company name, timestamps, and a unique `{ userId, ticker }` index.
* Watchlist input validation added for trimmed, uppercase stock tickers.
* Watchlist service protects against duplicate tickers and only removes items owned by the authenticated user.
* Shared Watchlist TypeScript request and response types added.
* Protected `/watchlist` web page added with persistent list loading, ticker addition, ticker removal, empty state, and API error display.
* Dashboard navigation link to the Watchlist page added.
* React Query provider added for web data fetching and Watchlist cache invalidation.
* JWT module export fixed so feature modules importing `AuthModule` can resolve `JwtService` for `JwtAuthGuard`.
* Focused Watchlist service and DTO validation tests added.
* Finnhub market data provider added behind a provider-neutral interface.
* Authenticated market data search, quote, bulk quote, and company profile endpoints added.
* In-memory TTL caching added for live quotes, symbol search, and company profiles as the Redis integration fallback.
* Watchlist stock autocomplete and live quote display added.
* Watchlist rows replaced with reusable responsive fintech-style stock cards.
* Stock cards now show circular Finnhub company logos with circular fallback initials when a logo is missing.
* Reusable stock formatting helpers added for currency, percentage, and positive, negative, or neutral change variants.
* Stock card selection now opens a details modal with the latest quote values while the separate remove action deletes without opening the modal.
* Authenticated stock details endpoint added with `GET /market/stocks/:symbol/details`.
* Authenticated historical candle endpoint added with `GET /market/stocks/:symbol/candles?range=1d|1w|1m|1y`.
* Shared normalized stock details, candle, candle-range, and candle-response TypeScript contracts added.
* Historical chart provider separated from the live Finnhub provider through `HistoricalMarketDataProvider`.
* `YahooFinanceProvider` added with `yahoo-finance2` chart API integration.
* Yahoo Finance range mapping added: `1D → 1d/5m`, `1W → 7d/1h`, `1M → 1mo/1d`, and `1Y → 1y/1wk`.
* Yahoo Finance candle normalization filters null values and incomplete OHLCV records.
* Historical candle requests are cached for 5 minutes.
* Stock details modal extended with responsive historical chart, `1D`, `1W`, `1M`, and `1Y` selectors, loading state, empty state, and provider-error state.
* Historical chart color now reflects the selected range trend: green for positive, red for negative, and gray for unchanged.
* Focused Yahoo Finance provider tests added for range mapping, candle normalization, invalid candle filtering, invalid symbols, and provider failures.
* Dashboard Market Movers section added with separate Top Gainers and Top Losers lists.
* `FmpMarketMoversProvider` added for Financial Modeling Prep market movers without changing the existing Finnhub and Yahoo Finance integrations.
* Authenticated Market Movers API added with `GET /market/movers`.
* FMP integration uses the current `/stable/biggest-gainers` and `/stable/biggest-losers` endpoints. Legacy `/api/v3/stock_market/*` endpoints are intentionally not used.
* FMP market mover records are normalized into typed shared contracts, including safe percentage parsing, invalid-record filtering, deterministic sorting, and a top-10 limit.
* FMP market movers are cached in memory for 5 minutes.
* Market Movers dashboard lists include loading skeletons, empty states, safe provider-error states, green gainers styling, and red losers styling.
* `FMP_API_KEY` added to the sanitized backend environment example.
* Focused FMP provider tests added for normalization, percentage parsing, filtering, sorting, top-10 limiting, missing configuration, provider errors, and cache reuse.

Technical cleanup:

* Added *.tsbuildinfo to .gitignore.
* Removed generated tsconfig.tsbuildinfo from source control.
* Verified repository consistency.

Validation results:

✅ npm run type-check

✅ npm run lint

✅ npm run test

✅ npm run build

✅ docker compose config

✅ git diff --check

Runtime validation:

✅ Google Sign In opens from `http://localhost:3000/login`

✅ Successful login redirects to the dashboard

✅ User document is created in MongoDB

✅ Session survives browser refresh

✅ Protected dashboard redirects unauthenticated users to `/login`

✅ Protected Watchlist page opens from the dashboard

✅ Watchlist items can be added, persisted after refresh, and removed

✅ Duplicate Watchlist tickers are rejected per user

✅ Watchlist stock cards show circular logos or fallback initials, formatted price changes, and a details modal

✅ API starts with `WatchlistModule` and JWT guard dependencies resolved

✅ Stock details modal shows current Finnhub quote data and historical Yahoo Finance chart data

✅ Stock chart ranges `1D`, `1W`, `1M`, and `1Y` are wired to Yahoo Finance intervals

✅ Real Yahoo Finance `AAPL` chart request returns OHLCV candles without Finnhub premium access

✅ Dashboard shows Financial Modeling Prep Top Gainers and Top Losers

✅ Real FMP `/stable/biggest-gainers` and `/stable/biggest-losers` requests return market mover data

✅ Legacy FMP `/api/v3/stock_market/*` endpoint failure diagnosed and replaced with stable endpoints

---

# MVP Scope

Version 1.0

Authentication:

* Google Login

Watchlist:

* Add ticker
* Remove ticker
* List tracked companies

Portfolio:

* Add position
* Edit position
* Remove position
* Display profit/loss

Market Data:

* Current stock price
* Daily change
* Dashboard Top Gainers and Top Losers
* Historical chart with `1D`, `1W`, `1M`, and `1Y` ranges
* Portfolio performance

AI Reports:

* Manual report generation
* Watchlist analysis
* Portfolio analysis

Telegram:

* Connect Telegram account
* Send generated reports

Alerts:

* Configure price alerts
* Notify users when alert conditions are met

Market Intelligence:

* News feed
* Earnings calendar

---

# Planned Roadmap

Completed foundation:

* MongoDB integration ✅
* Initial domain models ✅
* Health endpoint ✅
* Google Authentication ✅
* Watchlist CRUD ✅
* Stock Market Data Provider ✅

Next TODO plan:

* [ ] Portfolio CRUD
* [ ] Portfolio Dashboard (P/L, Total Value)
* [ ] Telegram Bot
* [ ] AI Reports
* [ ] Price Alerts
* [ ] TradingAgents Integration
* [ ] News Feed
* [ ] Earnings Calendar

Later infrastructure work:

* [ ] Scheduled Jobs (08:00 / 18:00)
* [ ] AWS Deployment

---

# Long-Term Vision

The platform should become a personal AI investment assistant capable of:

* Monitoring owned positions.
* Tracking selected companies.
* Analyzing market news.
* Running multi-agent investment research.
* Identifying new investment opportunities.
* Delivering actionable reports twice per day through Web and Telegram.
