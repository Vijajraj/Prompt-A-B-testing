# ⚡ Prompt A/B Testing Dashboard (Hybrid LLMOps + MLOps)

A hybrid LLMOps + MLOps workbench that tests 3 prompt variants in parallel on Groq, scores them using a trained Random Forest model (with one-sentence explanations from Groq), logs metrics to MLflow on DagsHub, monitors drift with Evidently AI, and promotes the winner to Llama 3.3 70B via OpenRouter.

## Tech Stack

| Layer | Tool | Purpose |
|-------|------|---------|
| Backend | FastAPI + LangChain | Serving routes, loading models, scoring switcher |
| Frontend | React + Vite + Tailwind v4 | Single-page SaaS-style workbench & MLOps Control Center |
| Database | Supabase (PostgreSQL) | Stores execution logs (`ab_logs`) and training data (`training_data`) |
| A/B LLM | Groq LLaMA 3.1 8B | Generates variant responses |
| ML Scorer | Random Forest (scikit-learn) | Deterministic scoring based on 8 text features |
| Scorer Explainer | Groq LLaMA 3.1 8B | Explains ML scores in one sentence |
| Promote LLM | Llama 3.3 70B via OpenRouter | Production inference of winning variant |
| Experiment Tracking | MLflow | Tracks model runs, params, and feature importances |
| Drift Monitoring | Evidently AI | Detects distribution drift on input text features |
| CI/CD | GitHub Actions | Standard tests on push + weekly auto-retrain and Render delivery |
| Global MLflow Hosting | DagsHub | Remote tracking server for MLflow runs |
| Artifact Storage | Supabase Storage | Remote hosting of `scorer.pkl` and `drift_report.html` |

---

## Folder Structure

- `/backend` — FastAPI application files (`main.py`, `scorer.py`, `feature_extractor.py`)
- `/ml` — Random Forest training script (`train.py`) and backup data downloader (`bootstrap_data.py`)
- `/monitoring` — Evidently drift detection script (`drift_check.py`)
- `/frontend-react` — React Vite Tailwind dashboard application
- `/models` — Local cache folder for trained `scorer.pkl` models (gitignored)
- `/mlruns` — Local MLflow tracking run registry (gitignored)

---

## Local Development & Setup

### 1. Database Setup
Create tables in Supabase using `supabase_setup.sql` SQL editor. Disable Row Level Security (RLS) for both `ab_logs` and `training_data` tables.

### 2. Environment Configuration
Copy `.env.example` to `.env` in the project root and fill in your keys:
- `GROQ_API_KEY`
- `OPENROUTER_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `SCORER=auto` (auto-detects model, falls back to judge LLM if missing)
- `MODEL_BUCKET=model-artifacts`
- `MLFLOW_TRACKING_URI=./mlruns` (or your remote DagsHub MLflow tracking URL)

### 3. Install Dependencies & Start Backend
```bash
# From the project root
.venv\Scripts\pip install -r backend/requirements.txt
cd backend
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### 4. Start React Frontend
```bash
cd frontend-react
npm install
npm run dev
```
Open **http://localhost:5174/** in your browser.

---

## MLOps Pipeline Workflows

### 1. Collect Bootstrap Data (Phase 1)
Run prompt tests using the dashboard with `SCORER=judge` to collect scored responses. This automatically populates the `training_data` table in Supabase. Aim for at least 30-50 rows to start.

### 2. Train the Random Forest Model (Phase 2)
Train the model by triggering it from the dashboard's **MLOps Dashboard** tab, or manually:
```bash
python ml/train.py
```
This trains the model, records metrics to MLflow, saves the model locally, and uploads it to Supabase Storage.

### 3. Monitor for Feature Drift
Generate data drift reports via the MLOps dashboard tab, or manually:
```bash
python monitoring/drift_check.py
```
Evidently compares recent inputs against the training set and flags any significant feature drift.

### 4. CI/CD & Automated Training
Every git push triggers the **CI** workflow in `.github/workflows/ci.yml` running pytest checks.
The **Retrain Model** workflow runs weekly (or on manual trigger) via GitHub Actions, pings the Render deploy hook upon successful training, causing Render to redeploy and download the newly generated `scorer.pkl` on startup.
