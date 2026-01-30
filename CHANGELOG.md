# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.0] - 2026-01-30

### Added

- **Helius API Integration** - Solana blockchain data fetching with rate limiting, retry logic, and transaction parsing
  - API client (`helius-client.ts`), trade parser (`trade-parser.ts`), and helper modules for validation and swap detection
  - 93 unit tests covering client, parser, and helpers
- **Trade Service Layer** - Idempotent trade synchronization from Helius to database
  - Core service (`trade-service.ts`) with sync orchestration, duplicate detection, and wallet balance updates
  - Cashout calculator integration for trade recommendations
- **Trade Refresh API** - `POST /api/trades/refresh` endpoint with Zod validation and structured error responses
- **Configuration & Types** - Helius config with rate limits, trade parsing types (`TokenBalance`, `AggregatedTrade`, `ParsedTrade`), and sync types (`SyncResult`, `TradeRefreshRequest`, `TradeRefreshResponse`)
- **Error Handling** - Custom error classes: `HeliusError`, `ApiError`, `ValidationError`

### Changed

- Updated documentation (roadmap.md, project-structure.md, technical-design.md, AGENTS.md) to reflect Days 5-7 completion
- Total test count: 229 tests (all passing)

## [0.2.0] - 2026-01-30

### Added

- **Core Business Logic** - Tier and cashout calculation modules
  - Tier calculator with 5-tier boundary logic based on SOL balance
  - Cashout calculator with multipliers (tier, ROI, streak, goal boost)
  - Helper functions for ROI bonus, streak multiplier, and goal boost calculations
  - Support for all 5 calculation examples from functional-logic.md

## [0.1.0] - 2026-01-22

### Added

- **Supabase Integration** - Database client with type safety, RLS policies, and TypeScript definitions
  - Schema: users, wallets, trades, cashouts, goal_settings, user_state tables
  - Complete TypeScript interfaces and enums (Tier, TradeStatus, CashoutStatus)
- **Health Check Page** - Supabase connection monitoring endpoint
- **Project Setup** - Next.js 16 + TypeScript 5 + Tailwind CSS 4 + shadcn/ui
- **Documentation** - PRD, functional-logic.md, technical-design.md, roadmap.md, project-structure.md
- **Tooling** - ESLint configuration with TypeScript rules

### Fixed

- Thread-related issues in Supabase client setup
