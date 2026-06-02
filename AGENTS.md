# AGENTS.md

## Project Overview

AI Stock Advisor is an MVP for delivering stock analysis and scheduled updates through a web app and Telegram bot. Keep the first version simple, modular, and easy to deploy. Avoid adding abstractions, infrastructure, or features before they are needed.

## Technology Stack

- Web: Next.js with TypeScript
- API: NestJS with TypeScript
- Database: MongoDB with Mongoose
- Jobs: Redis with BullMQ for scheduled and background work
- Bot: Telegram bot integration
- Trading analysis: TradingAgents as a separate Python service running in Docker
- Deployment: AWS later; do not add AWS-specific complexity unless requested

## Language Rules

- Use TypeScript for all application code outside the TradingAgents service.
- Keep the TradingAgents integration isolated as a separate Python Docker service.
- Do not introduce JavaScript files when TypeScript is suitable.
- Prefer explicit types at service boundaries, including API DTOs, queue payloads, environment configuration, and TradingAgents requests and responses.

## Architecture Guidelines

- Keep the web app, API, and TradingAgents service separated by clear interfaces.
- Organize NestJS code by feature modules rather than by technical layer alone.
- Keep controllers thin. Put business logic in services.
- Keep Mongoose schemas, DTOs, queue processors, and external integrations modular.
- Put scheduled and background work in BullMQ jobs instead of request handlers.
- Treat Telegram as an adapter: bot handlers should call application services rather than contain business logic.
- Communicate with TradingAgents through a small, documented HTTP interface. Do not import Python code into the TypeScript services.
- Prefer straightforward MVP implementations over speculative abstractions or premature scaling work.

## Suggested Repository Layout

Use this layout when scaffolding the project unless the repository already establishes another convention:

```text
apps/
  web/                 # Next.js application
  api/                 # NestJS application
services/
  trading-agents/      # Python TradingAgents Docker service
docs/                  # Optional architecture and API notes
docker-compose.yml     # Local MongoDB, Redis, and service orchestration
```

Shared TypeScript packages may be added under `packages/` only when there is a concrete reuse case.

## Configuration And Secrets

- Use environment variables for all configuration that changes by environment.
- Never commit real API keys, tokens, credentials, or secrets.
- Provide sanitized `.env.example` files for required variables.
- Validate required environment variables at application startup.
- Keep Telegram tokens, database URLs, Redis URLs, market-data credentials, and service URLs out of source code.
- Use obvious placeholder values in examples, such as `your_telegram_bot_token`.

## Data And Jobs

- Use Mongoose schemas for persisted MongoDB data.
- Keep stored documents minimal for the MVP.
- Define typed BullMQ payloads and make jobs safe to retry where practical.
- Use stable job names and avoid scheduling duplicate recurring jobs.
- Log job failures with enough context to debug them without exposing secrets.

## API And Integration Rules

- Validate incoming API payloads with NestJS DTOs.
- Return simple, consistent error responses.
- Keep external API calls behind dedicated integration services.
- Add timeouts and basic error handling for network calls.
- Do not expose internal credentials or raw third-party errors to clients.

## README Requirements

Update the root `README.md` whenever setup, configuration, or behavior changes. Keep it practical and include:

- Prerequisites
- Local setup steps
- Required environment variables and `.env.example` usage
- How to run the web app, API, MongoDB, Redis, Telegram bot, and TradingAgents service
- Docker or Docker Compose instructions when available
- How scheduled jobs work
- Basic test and lint commands
- Any AWS deployment notes once deployment work begins

## Testing And Quality

- Add focused tests for business logic, queue processors, and integration boundaries.
- Run the relevant lint, type-check, and test commands before finishing a change.
- Keep dependencies minimal and use the existing package manager once one is established.
- Add concise comments only where the intent is not clear from the code.

## MVP Scope

Choose the smallest implementation that delivers the requested behavior. For the initial MVP:

- Avoid microservices beyond the separate TradingAgents service.
- Avoid AWS-specific setup until deployment is requested.
- Avoid adding shared packages, event buses, or complex caching layers without a current need.
- Prefer a working vertical slice over broad scaffolding.

