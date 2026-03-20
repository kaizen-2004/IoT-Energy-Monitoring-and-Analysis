# Dashboard UI (`UI/`)

Figma-generated React/Vite dashboard used by this project.

## Run locally

1. Install dependencies:
```bash
npm install
```

2. Optional API base override:
```bash
cp .env.example .env
# then edit VITE_API_BASE if needed
```

3. Start dev server:
```bash
npm run dev
```

By default, it reads from `VITE_API_BASE` (or falls back to `http://localhost:8080`).
  
