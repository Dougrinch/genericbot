# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **browser autoclicker bot for idle/clicker games** built with React + TypeScript + Vite. The bot creates a floating control panel that can be injected into any browser game page via console injection or browser extensions like Tampermonkey. The project includes a comprehensive testing setup with both unit and browser-based UI tests.

## Development Commands

- `npm run dev` - Start development server with test page and HMR for rapid bot development
- `npm run build` - Build production bundle for browser console injection (single JS file)
- `npm run lint` - Run ESLint on the codebase
- `npm run test` - Run all tests (unit and UI tests via Vitest)
- `npm run test:ui` - Run tests with visible browser UI (headless=false)
- `npm run coverage` - Generate test coverage reports

## Project Structure

```
src/
├── main.tsx           # Development entry point
├── game/              # Development test page (NOT production)
│   ├── Game.tsx       # Test page with clickable elements for bot development
│   ├── Game.css       # Test page styles
│   └── index.css      # Global styles
└── bot/               # PRODUCTION: Autoclicker bot components
    ├── Bot.tsx        # Main bot floating panel UI
    ├── bot.css        # Bot panel styling
    └── injection.tsx  # Browser injection and DOM manipulation utilities

tests/
├── setup.shared.ts    # Shared test configuration
├── unit/              # Unit tests (jsdom environment)
│   ├── setup.unit.ts  # Unit test specific setup
│   └── test.spec.ts   # Core functionality tests
└── ui/                # Browser UI tests (Playwright)
    ├── setup.ui.ts    # UI test specific setup
    └── Game.spec.tsx  # Bot integration tests
```

## Testing Architecture

Uses **Vitest** with a dual-project configuration:

### Unit Tests
- **Environment**: jsdom
- **Location**: `tests/unit/**/*.spec.{ts,tsx}`
- **Purpose**: Fast component and utility testing
- **Setup**: Shared + unit-specific setup files

### UI/Integration Tests
- **Environment**: Browser (Playwright + Chromium)
- **Location**: `tests/ui/**/*.spec.{ts,tsx}`
- **Purpose**: Full browser testing with real DOM interactions
- **Features**: Supports `vitest-browser-react` for React component rendering
- **Setup**: Shared + UI-specific setup files

### Coverage
- **Provider**: V8
- **Focus**: `src/bot/**` (production bot components only)
- **Reports**: Generated in `coverage/` directory

## Architecture

### Production Components (`src/bot/`)
- **Bot.tsx**: Main autoclicker bot UI - floating control panel with settings, buttons, and status indicators
- **injection.tsx**: Browser DOM manipulation utilities for game page integration
- **bot.css**: Bot panel styling optimized for overlay display on any website

### Development Environment (`src/game/`)
- **Game.tsx**: Test page simulating clicker game elements (buttons, counters, etc.)
- **main.tsx**: Development entry point combining test page + bot for rapid development
- **Enables HMR**: Live reloading during bot development without manual browser injection

### Build Configuration
- **Build Tool**: Vite with `@vitejs/plugin-react` for Fast Refresh using Babel
- **TypeScript Configuration**: Split configuration with `tsconfig.app.json` for app code and `tsconfig.node.json` for build tooling
- **Production Output**: Single bundled JS file for console/Tampermonkey injection

## Testing Libraries & Tools

- **Vitest**: Primary test runner with browser support
- **Playwright**: Browser automation for UI tests
- **@vitest/browser**: Browser testing integration
- **vitest-browser-react**: React-specific browser testing utilities
- **jsdom**: DOM simulation for unit tests
- **@vitest/coverage-v8**: Code coverage reporting

## ESLint Configuration

Uses flat config format (`eslint.config.js`) with:
- TypeScript ESLint recommended rules
- React Hooks plugin with latest recommended rules  
- React Refresh plugin for Vite compatibility
- Ignores `dist` directory

## Deployment

### Console Injection
1. Build production bundle: `npm run build`
2. Copy generated JS from `dist/` directory
3. Paste into browser console on target game page
4. Bot creates floating control panel overlay

### Browser Extension (Tampermonkey)
1. Use production build as script payload
2. Configure user script for target game domains
3. Automatic injection on page load

## Test Setup Details

### Shared Setup (`tests/setup.shared.ts`)
- Configures fake timers for consistent bot behavior testing
- Resets DOM state between tests
- Provides clean `<div id="root"></div>` for each test

### UI Test Features
- Real browser interactions via Playwright (simulates actual game environments)
- Support for `expect.element()` assertions
- Dynamic module importing for testing bot injection
- React component rendering with `vitest-browser-react`

The testing setup validates both bot functionality and its ability to integrate with various game page structures.

## Architecture Rules

- **CRITICAL: Use specific state selectors instead of getting the whole state** - When using `useGame()` or `useConfig()`, MUST select only the specific properties you need (e.g., `useGame(s => s.enabled)`) rather than getting the entire state with `useGame()` or `useConfig()`. This is critical for performance as it prevents unnecessary re-renders when unrelated state changes.
- **CRITICAL: All tests must pass before changes are considered complete** - After making any changes, MUST run `npm run test` and ensure all tests are green. Changes are not complete until all tests pass.

## Component Architecture Guidelines

- **CRITICAL: Component Separation & SOLID Principles** - All new interface code MUST be well separated into individual components. Each component MUST follow React guidelines and basic SOLID principles:
  - **Single Responsibility**: Each component should have one clear purpose and reason to change
  - **Open/Closed**: Components should be open for extension but closed for modification through proper prop interfaces
  - **Liskov Substitution**: Components should be replaceable with their subtypes without breaking functionality
  - **Interface Segregation**: Component props should be focused and not force dependence on unused properties
  - **Dependency Inversion**: Components should depend on abstractions (props/interfaces) not concretions

## State Management Architecture

- **UI-Specific State Location** - All UI-specific state (component visibility, form inputs, loading states, etc.) MUST be located directly in React components using `useState`, `useReducer`, or other React state management hooks. Do NOT store UI state in external stores.

- **Configuration State Management** - All bot configuration state MUST be located in `src/bot/Config.ts`. This includes:
  - Bot settings and preferences
  - Feature toggles and enabled/disabled states
  - Persistent configuration that should survive component re-renders

- **Configuration State Updates** - All updates to configuration state MUST be done via the `configUpdaters` object defined in `src/bot/Config.ts`. Never directly mutate configuration state. Always use the provided updater functions to ensure state consistency and proper immutability with Immer.

## Code Completion Checklist

**CRITICAL: All code modifications MUST complete this checklist before being considered finished. NO EXCEPTIONS.**

### Required Validation Steps (in order):

1. **✅ ESLint Validation** - Run `npm run lint` and ensure zero errors/warnings
   - All code formatting, imports, and style rules must pass
   - Use `npm run lint -- --fix` for auto-fixable issues
   - Changes are NOT complete until ESLint shows green

2. **✅ Test Coverage Validation** - Ensure all new code is covered by tests
   - **All new code MUST be covered by tests** - New functions, components, and features require corresponding test coverage to ensure reliability and prevent regressions
   - Write unit tests for new utility functions and components
   - Write UI tests for new user interactions and workflows
   - Verify tests actually exercise the new code paths

3. **✅ Test Suite Validation** - Run `npm run test` and ensure all tests pass
   - Both unit tests (jsdom) and UI tests (browser) must pass
   - No TypeScript compilation errors
   - No build warnings or failures
   - No test failures, errors, or timeouts permitted
   - If tests fail, fix the underlying issues before proceeding

4. **✅ Git Tracking** - Ensure all new files are added to version control
   - Use `git add <filepath>` for any newly created files
   - Run `git status` to verify all changes are tracked

### Completion Criteria

Code modifications are only complete when:
- ✅ ESLint passes with zero issues
- ✅ All new code is covered by appropriate tests
- ✅ All tests pass without failures (including TypeScript compilation)
- ✅ All files are tracked in git

**If ANY step fails, the code modification is INCOMPLETE and must be fixed.**

## Code Style Guidelines

- **CRITICAL: ESLint must pass without errors** - All code changes MUST pass ESLint validation. Run `npm run lint` to verify code meets project standards. ESLint enforces consistent formatting, proper imports, React best practices, and coding conventions. Changes are not complete until ESLint shows green (no errors or warnings).
- **CRITICAL: Add new files to git immediately** - When creating new files with the Write tool, immediately add them to git using `git add <filepath>`. This ensures proper version control tracking from the moment of creation.
- Don't use trailing commas
