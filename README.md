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
```
