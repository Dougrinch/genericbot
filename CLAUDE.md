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
├── page/              # Development test page (NOT production)
│   ├── App.tsx        # Test page with clickable elements for bot development
│   ├── App.css        # Test page styles
│   └── index.css      # Global styles
└── widget/            # PRODUCTION: Autoclicker bot components
    ├── Bot.tsx        # Main bot floating panel UI
    ├── bot.css        # Bot panel styling
    └── injection.tsx  # Browser injection and DOM manipulation utilities

tests/
├── setup.shared.ts    # Shared test configuration
├── unit/              # Unit tests (jsdom environment)
│   ├── setup.ts       # Unit test specific setup
│   └── test.spec.ts   # Core functionality tests
└── ui/                # Browser UI tests (Playwright)
    ├── setup.ts       # UI test specific setup
    └── App.spec.tsx   # Bot integration tests
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
- **Focus**: `src/widget/**` (production bot components only)
- **Reports**: Generated in `coverage/` directory

## Architecture

### Production Components (`src/widget/`)
- **Bot.tsx**: Main autoclicker bot UI - floating control panel with settings, buttons, and status indicators
- **injection.tsx**: Browser DOM manipulation utilities for game page integration
- **bot.css**: Bot panel styling optimized for overlay display on any website

### Development Environment (`src/page/`)
- **App.tsx**: Test page simulating clicker game elements (buttons, counters, etc.)
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