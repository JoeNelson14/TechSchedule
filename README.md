# TechSchedule

TechSchedule is a full-stack application with:
- **Backend:** FastAPI + SQLAlchemy + PostgreSQL
- **Frontend:** React + Vite + Tailwind

## Local development

### Backend
```bash
cd Tech_Backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend
```bash
cd Tech_Frontend
npm ci
npm run dev
```

## Render deployment

This repository includes `render.yaml` for Blueprint-based deploys.

### Services defined
1. **techschedule-api** (Python web service)
   - Root directory: `Tech_Backend`
   - Build command: `pip install -r requirements.txt`
   - Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
2. **techschedule-frontend** (Static site)
   - Root directory: `Tech_Frontend`
   - Build command: `npm ci && npm run build`
   - Publish path: `dist`
   - SPA rewrite to `index.html`

### Required environment variables
- `techschedule-api`
  - `DATABASE_URL` (Render PostgreSQL internal connection string)
  - `SECRET_KEY`
  - `ACCESS_TOKEN_EXPIRE_MINUTES` (optional; defaults in blueprint to `60`)
- `techschedule-frontend`
  - `VITE_API_BASE_URL` (public URL of `techschedule-api`)

## Notes
- Keep generated artifacts out of git using the root `.gitignore`.
- For deployment-specific dependency references:
  - Backend: `Tech_Backend/requirements.txt`
  - Frontend build requirements: `Tech_Frontend/requirements.txt`
