# Planet Finder

A space-themed web app that detects exoplanets from stellar light curves using a CNN model trained on NASA Kepler photometry data.

## Run & Operate

- `pnpm --filter @workspace/planet-finder run dev` — run the React frontend (port 26227)
- `python3 /home/runner/workspace/python-backend/main.py` — run the Python model API (port 8000)
- `pnpm run typecheck` — full typecheck across all packages

## Stack

- **Frontend**: React + Vite, Tailwind CSS, Recharts, Framer Motion, Wouter
- **Backend (Python)**: FastAPI + Uvicorn, TensorFlow/Keras, NumPy
- **Model**: CNN (`cnn_exoplanets.keras`) — binary classifier on 3197-point light curves
- **Data**: `sample_lightcurves.npz` — 570 real Kepler samples (raw + preprocessed)
- pnpm workspaces, Node.js 24, TypeScript 5.9

## Where things live

- `artifacts/planet-finder/src/` — React frontend
- `artifacts/planet-finder/src/lib/api.ts` — fetch helpers for model API
- `artifacts/planet-finder/src/pages/Home.tsx` — main page
- `artifacts/planet-finder/src/components/` — Starfield, LightCurveChart, Sparkline
- `python-backend/main.py` — FastAPI model server
- `python-backend/model_setup.py` — file path resolution for model bundle
- `python-backend/cnn_exoplanets.keras` — the CNN model
- `python-backend/sample_lightcurves.npz` — 570 sample light curves

## Architecture decisions

- Python FastAPI backend served at `/model-api/` via reverse proxy (separate service in artifact.toml)
- Model loads lazily on first request to minimize startup time
- Samples endpoint returns both raw values (for chart) and downsampled preview (for sparkline)
- Frontend calls `/model-api/samples` and `/model-api/predict` directly — no Express proxy needed
- Light curves are preprocessed (z-score normalized) before model inference

## Product

Users select from preloaded Kepler stellar light curves grouped by "Confirmed Exoplanet" and "Non-Exoplanet." Clicking a card shows the full light curve chart. Clicking "Analyze Light Curve" sends the 3197 flux values to the CNN model, which returns a prediction label and confidence score with dramatic visual feedback.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- The Python backend (`/model-api/`) is a separate service — it must be running alongside the React app
- First inference is slow (~2-3s) because TensorFlow initializes on the first call
- `huggingface_hub` couldn't be installed (Python 3.13 compat issue) but not needed since `model_config.json` has no hub files
- Run with absolute path: `python3 /home/runner/workspace/python-backend/main.py`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
