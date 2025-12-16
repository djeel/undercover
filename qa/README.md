# QA Test Suite

This directory contains the End-to-End (E2E) tests for the Undercover application.

## Tools
- **Framework**: Playwright
- **Language**: TypeScript

## Setup
1.  Navigate to this directory: `cd qa`
2.  Install dependencies: `npm install -D @playwright/test`
3.  Install browsers: `npx playwright install`

## Running Tests
-   Run all tests: `npx playwright test`
-   Run in UI mode: `npx playwright test --ui`
-   Show report: `npx playwright show-report`

## Directory Structure
-   `tests/`: Contains spec files.
-   `playwright.config.ts`: Configuration.
