# Crypto Gateway Frontend

Next.js merchant, checkout, and admin frontend for the Crypto Gateway project.

## Getting Started

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Local QA

Use the full local QA command before committing frontend UI changes:

```bash
npm run qa:local
```

This runs lint, production build, and route smoke checks. The smoke check expects the frontend to be available at `http://localhost:3000`.

To point smoke checks at another frontend URL:

```bash
SMOKE_BASE_URL=http://localhost:3001 npm run smoke
```

On Windows PowerShell:

```powershell
$env:SMOKE_BASE_URL="http://localhost:3001"; npm run smoke
```

## Useful Commands

```bash
npm run lint
npm run build
npm run smoke
npm run e2e:contract
npm run e2e:smoke
```

The browser smoke suite uses Playwright and covers desktop/mobile render paths, including mocked admin and merchant session branches plus the expired-pending payment regression. On a fresh machine, install the Chromium browser binary once:

```bash
npm exec playwright install chromium
```

The full-stack contract suite uses the real backend and frontend instead of mocked API routes. Start the backend at `http://localhost:5000` and the frontend at `http://localhost:3000`, then run:

```bash
npm run e2e:contract
```

To target another backend or frontend URL:

```bash
CONTRACT_API_BASE_URL=http://localhost:5001 E2E_BASE_URL=http://localhost:3001 npm run e2e:contract
```

On Windows PowerShell:

```powershell
$env:CONTRACT_API_BASE_URL="http://localhost:5001"; $env:E2E_BASE_URL="http://localhost:3001"; npm run e2e:contract
```
