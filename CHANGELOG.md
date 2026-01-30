# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Vitest testing framework with React Testing Library
- 136 unit tests covering core business logic
- Test suites for tier calculator, cashout calculator, helpers, and error classes
- Coverage reporting with @vitest/coverage-v8

### Changed

- Updated roadmap.md to mark Day 3-4 complete with testing
- Updated project-structure.md with test files and helper modules
- Updated technical-design.md with Testing Stack section
- Updated AGENTS.md with test commands and checklist

## [0.2.0] - 2026-01-30

### Added

- Core business logic calculation modules
  - Tier calculator with boundary logic (tiers 1-5 based on SOL balance)
  - Cashout calculator with multipliers (tier, ROI, streak, goal boost)
  - Constants and configuration (TIER_BOUNDARIES, TIER_CONFIG, ROI_MULTIPLIERS, etc.)
- Helper functions for calculations
  - calculateROIBonus, calculateStreakMultiplier, applyGoalBoost
  - validateCashoutInput, getGoalBoostForGap, isValidTier, getNextTier
- Support for all 5 calculation examples from functional-logic.md Section 3.5

## [0.1.0] - 2026-01-22

### Added

- Supabase database integration
  - Database client wrapper with type safety
  - TypeScript type definitions for all tables
  - Row Level Security (RLS) policies
- Database schema
  - Users, wallets, trades, cashouts, goal_settings, user_state tables
  - Complete TypeScript interfaces and enums (Tier, TradeStatus, CashoutStatus)
- Health check page for Supabase connection monitoring
- Project documentation
  - PRD, functional-logic.md, technical-design.md, roadmap.md
  - Project structure documentation
- Next.js 16 + TypeScript 5 + Tailwind CSS 4 setup
- shadcn/ui component library integration
- ESLint configuration with TypeScript rules

### Fixed

- Thread-related issues in Supabase client setup
