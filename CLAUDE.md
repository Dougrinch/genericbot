# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React + TypeScript + Vite project with a minimal setup for React development with Hot Module Replacement (HMR) and ESLint rules.

## Development Commands

- `npm run dev` - Start the development server with HMR
- `npm run build` - Build the project (runs TypeScript compiler check first, then Vite build)
- `npm run lint` - Run ESLint on the codebase
- `npm run preview` - Preview the built application locally

## Architecture

- **Build Tool**: Vite with `@vitejs/plugin-react` for Fast Refresh using Babel
- **TypeScript Configuration**: Split configuration with `tsconfig.app.json` for app code and `tsconfig.node.json` for build tooling
- **Entry Point**: `src/main.tsx` renders the root App component with React StrictMode
- **Main Component**: `src/App.tsx` contains a basic counter example demonstrating React hooks

## ESLint Configuration

Uses flat config format (`eslint.config.js`) with:
- TypeScript ESLint recommended rules
- React Hooks plugin with latest recommended rules  
- React Refresh plugin for Vite compatibility
- Ignores `dist` directory

The README suggests upgrading to type-aware lint rules for production applications using `recommendedTypeChecked` or `strictTypeChecked` configurations.