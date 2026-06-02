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
* Browser session persistence added through JWT local storage and `/auth/me`.
* API Google ID token validation added.
* API JWT generation added.
* MongoDB user creation on first login added.
* User retrieval endpoint added.

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
* Portfolio performance

AI Reports:

* Manual report generation
* Watchlist analysis
* Portfolio analysis

Telegram:

* Connect Telegram account
* Send generated reports

---

# Planned Roadmap

Phase 1

* MongoDB integration
* Domain models
* Health endpoint

Phase 2

* Google Authentication ✅

Phase 3

* Watchlist CRUD

Phase 4

* Portfolio CRUD

Phase 5

* Stock Market Data Provider

Phase 6

* Telegram Integration

Phase 7

* Scheduled Jobs (08:00 / 18:00)

Phase 8

* TradingAgents Integration

Phase 9

* AI Investment Reports

Phase 10

* AWS Deployment

---

# Long-Term Vision

The platform should become a personal AI investment assistant capable of:

* Monitoring owned positions.
* Tracking selected companies.
* Analyzing market news.
* Running multi-agent investment research.
* Identifying new investment opportunities.
* Delivering actionable reports twice per day through Web and Telegram.
