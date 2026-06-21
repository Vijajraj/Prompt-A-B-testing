# Deployment Spec — Prompt A/B Testing Dashboard

## Project Summary

Three prompt variants tested live on Groq (LLaMA 3 8B).
Judge LLM scores each response. Winner auto-sent to Llama 3.3 70B
via OpenRouter. Everything shown on one page.

---

## Two Phases

Phase 1 — Local: Streamlit for testing backend, React for final frontend
Phase 2 — Global: FastAPI on Render, React on Vercel

Same backend code for both phases.
Only one line changes between local and global — VITE_API_URL in React.

---

## Full Stack

| Layer            | Tool                              | Local              | Global                        |
|------------------|-----------------------------------|--------------------|-------------------------------|
| Backend          | FastAPI + LangChain               | localhost:8000     | Render (free)                 |
| A/B LLM          | Groq LLaMA 3 8B                   | Same               | Same                          |
| Promote LLM      | Llama 3.3 70B via OpenRouter      | Same               | Same                          |
| Database         | Supabase                          | Same project       | Same project                  |
| Frontend (test)  | Streamlit                         | localhost:8501     | Not deployed                  |
| Frontend (final) | React + Vite + Tailwind           | localhost:5173     | Vercel (free)                 |

---

## Folder Structure

```
prompt-ab-tester/
├── backend/
│   ├── main.py                  ← FastAPI app (all routes)
│   └── requirements.txt
├── frontend-streamlit/          ← local testing only, not deployed
│   ├── app.py
│   └── requirements.txt
├── frontend-react/              ← this goes to Vercel
│   ├── src/
│   │   ├── App.jsx              ← main component, all state here
│   │   ├── main.jsx
│   │   └── components/
│   │       ├── PromptInputs.jsx ← 3 prompt boxes + query box + button
│   │       ├── ResultsGrid.jsx  ← 3 result cards side by side
│   │       ├── WinnerBanner.jsx ← winner highlight + promoted output
│   │       └── RunHistory.jsx   ← table of past runs
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── .env.local               ← VITE_API_URL for local
├── supabase_setup.sql
├── .env                         ← never push to GitHub
├── .env.example
├── .gitignore
├── SPEC.md
├── DEPLOY_SPEC.md               ← this file
└── README.md
```

---

## Environment Variables

### Backend (.env)
```
GROQ_API_KEY=your_groq_api_key
OPENROUTER_API_KEY=your_openrouter_api_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_anon_key
GROQ_MODEL=llama-3.1-8b-instant
PROMOTE_MODEL=meta-llama/llama-3.3-70b-instruct:free
```

### React frontend local (frontend-react/.env.local)
```
VITE_API_URL=http://localhost:8000
```

### React frontend global (set in Vercel dashboard)
```
VITE_API_URL=https://your-app.onrender.com
```

---

## Supabase Setup

Run this once in Supabase SQL Editor:

```sql
create table ab_logs (
  id           uuid default gen_random_uuid() primary key,
  prompt_a     text not null,
  prompt_b     text not null,
  prompt_c     text not null,
  query        text not null,
  response_a   text,
  response_b   text,
  response_c   text,
  score_a      float,
  score_b      float,
  score_c      float,
  winner       text,
  final_output text,
  created_at   timestamptz default now()
);
```

Then disable RLS: Table Editor → ab_logs → RLS → toggle off.

---

## Backend API Routes

| Method | Route          | What it does                                              |
|--------|----------------|-----------------------------------------------------------|
| GET    | /              | Health check, returns model names                         |
| POST   | /api/run       | Test 3 prompts on Groq, score, pick winner, log to Supabase |
| POST   | /api/promote   | Send winning prompt to Llama 3.3 70B via OpenRouter       |
| GET    | /api/logs      | Last 10 runs from Supabase                                |

---

## Phase 1 — Run Locally

### Terminal 1 — Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### Terminal 2 — React
```bash
cd frontend-react
npm install
npm run dev
```

Test at:
- Backend: http://localhost:8000
- Swagger: http://localhost:8000/docs
- React: http://localhost:5173

---

## Phase 2 — Deploy Globally

### Step 1 — Deploy backend on Render

Go to render.com → New → Web Service → connect GitHub repo.

Settings:
```
Root Directory:   backend
Runtime:          Python
Build Command:    pip install -r requirements.txt
Start Command:    uvicorn main:app --host 0.0.0.0 --port 8000
```

### Step 2 — Deploy React on Vercel

Go to vercel.com → Add New Project → import GitHub repo.

Settings:
```
Root Directory:    frontend-react
Framework:         Vite
Build Command:     npm run build
Output Directory:  dist
```

Add environment variable:
```
VITE_API_URL = https://your-app.onrender.com
```
