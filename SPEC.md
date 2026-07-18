# Prompt A/B Testing Dashboard — SPEC v5

## What this project does

A two-phase hybrid LLMOps + MLOps pipeline.

Phase 1 — Bootstrap: Test 3 prompt variants on Groq, use judge LLM
temporarily to collect scored training data, store in Supabase.

Phase 2 — MLOps: Train Random Forest on bootstrap data, track with
MLflow, replace judge LLM scoring with your ML model, Groq only
explains the score in one sentence, monitor drift with Evidently,
auto-retrain with GitHub Actions.

---

## Subject Alignment

Subject: AD4V71 - Machine Learning Operations (MLOps)
Concepts covered:
- Experiment tracking (MLflow)
- Model versioning (MLflow Model Registry)
- Data drift detection (Evidently AI)
- Continuous Training (GitHub Actions + auto-retrain)
- Continuous Integration (GitHub Actions tests on push)
- Continuous Delivery (auto-deploy updated model to Render)
- Model serving (FastAPI)
- LLMOps (prompt A/B testing, cross-provider routing)

---

## Tech Stack

| Layer               | Tool                          | Purpose                                        |
|---------------------|-------------------------------|------------------------------------------------|
| A/B LLM             | Groq LLaMA 3 8B               | Generate responses for all 3 variants          |
| Bootstrap scorer    | Groq judge LLM (temporary)    | Score responses during Phase 1 only            |
| ML scorer           | Random Forest (scikit-learn)  | Scores responses after Phase 2 training        |
| Explainer           | Groq (one sentence only)      | Explains the ML model score in plain English   |
| Experiment tracking | MLflow                        | Log every training run, params, metrics        |
| Drift detection     | Evidently AI                  | Monitor incoming feature distribution          |
| CI/CD               | GitHub Actions                | Auto-retrain + deploy on drift or push         |
| Promote LLM         | Llama 3.3 70B via OpenRouter  | Execute winning prompt in production           |
| Backend             | FastAPI                       | REST API serving all endpoints                 |
| Database            | Supabase                      | Store runs, scores, features, training data    |
| Frontend            | React + Vite + Tailwind       | Single page dashboard                          |
| Deployment          | Render + Vercel               | Free tier global deployment                    |
| MLflow hosting      | DagsHub (free)                | Host MLflow tracking server globally           |
| Model storage       | Supabase Storage              | Store rf_model.pkl globally (free 1GB)         |
| Drift report storage| Supabase Storage              | Store Evidently HTML reports globally          |

---

## Folder Structure

```
prompt-ab-tester/
├── backend/
│   ├── main.py                  ← FastAPI routes
│   ├── scorer.py                ← ML model scoring + Groq explanation
│   ├── feature_extractor.py     ← extract 8 features from response text
│   └── requirements.txt
├── ml/
│   ├── train.py                 ← train Random Forest on Supabase data
│   ├── bootstrap_data.py        ← optional: pull SummEval locally if needed
│   └── requirements.txt
├── monitoring/
│   └── drift_check.py           ← Evidently drift report
├── frontend-react/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── components/
│   │       ├── PromptInputs.jsx
│   │       ├── ResultsGrid.jsx
│   │       ├── WinnerBanner.jsx
│   │       └── RunHistory.jsx
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── .env.local
├── .github/
│   └── workflows/
│       ├── ci.yml               ← tests on every push
│       └── retrain.yml          ← retrain on drift detection
├── models/                      ← local only, NOT committed to repo
│   └── scorer.pkl               ← downloaded from Supabase Storage
├── mlruns/                      ← local only, gitignored
│                                   global tracking goes to DagsHub
├── supabase_setup.sql
├── .env
├── .env.example
├── .gitignore
├── SPEC.md
├── DEPLOY_SPEC.md
└── README.md
```

---

## Scoring Architecture

ML model scores. Groq explains. Two separate jobs.

```
Response comes in
        ↓
Feature extractor → 8 features extracted from response text
        ↓
Random Forest → predicts SCORE (float 1-10)   fast, deterministic
        ↓
Groq → generates REASON (one sentence)         explains the score
  prompt: "This response scored 8.2/10.
           Word count: 45, Bullets: Yes, Readability: 72.
           Write one sentence explaining why this score is justified."
        ↓
Return { score: 8.2, reason: "..." }
```

Groq is used only for the explanation — 20-30 tokens max.
Not for evaluation. Your ML model owns the score.

---

## Feature Extraction (8 features)

```python
{
  "word_count":       len(response.split()),
  "sentence_count":   number of sentences in response,
  "avg_sent_length":  word_count / sentence_count,
  "has_bullets":      1 if "•" or "-" in response else 0,
  "readability":      textstat.flesch_reading_ease(response),
  "prompt_length":    len(system_prompt.split()),
  "query_length":     len(query.split()),
  "prompt_style":     0=formal / 1=bullets / 2=simple
}
```

---

## Supabase Tables

```sql
create table ab_logs (
  id            uuid default gen_random_uuid() primary key,
  prompt_a      text not null,
  prompt_b      text not null,
  prompt_c      text not null,
  query         text not null,
  response_a    text,
  response_b    text,
  response_c    text,
  score_a       float,
  score_b       float,
  score_c       float,
  winner        text,
  final_output  text,
  created_at    timestamptz default now()
);

create table training_data (
  id               uuid default gen_random_uuid() primary key,
  log_id           uuid references ab_logs(id),
  variant          text,
  word_count       int,
  sentence_count   int,
  avg_sent_length  float,
  has_bullets      int,
  readability      float,
  prompt_length    int,
  query_length     int,
  prompt_style     int,
  score            float,
  created_at       timestamptz default now()
);
```
