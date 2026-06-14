# QA Test Suite

Full-stack test suite using [Playwright](https://playwright.dev/) and TypeScript.

## Structure

```
├── tests/
│   ├── e2e/          # Browser UI tests (Chromium, Firefox)
│   └── api/          # API tests
├── pages/            # Page Object Models
├── fixtures/         # Shared Playwright fixtures
├── utils/            # Helpers (test data, API wrappers)
├── playwright.config.ts
└── .env              # Local env vars (copy from .env.example)
```

## Setup

```bash
npm install
npx playwright install --with-deps
cp .env.example .env   # then fill in your values
```

## Running Tests

| Command | Description |
|---|---|
| `npm test` | Run all tests (headless) |
| `npm run test:e2e` | UI tests only |
| `npm run test:api` | API tests only |
| `npm run test:headed` | UI tests in headed browser |
| `npm run test:ui` | Open Playwright UI mode |
| `npm run test:debug` | Debug a failing test |
| `npm run report` | Open last HTML report |

## Environment Variables

Copy `.env.example` to `.env` and configure:

- `BASE_URL` — app URL under test
- `API_URL` — API base URL (defaults to `BASE_URL`)
- `API_TOKEN` — bearer token for API requests
- `TEST_USER_EMAIL` / `TEST_USER_PASSWORD` — credentials for E2E auth flows

## Adding Tests

- **E2E test**: add a `*.spec.ts` file under `tests/e2e/`
- **API test**: add a `*.spec.ts` file under `tests/api/`, import `test` from `fixtures/base.ts` to get `apiContext`
- **New page**: extend `BasePage` in `pages/` and add selectors as methods
