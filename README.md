# ⚡ Prompt A/B Testing Dashboard

Test 3 prompt variants on Groq (LLaMA 3), auto-score with a judge LLM, pick the winner, and promote it to Llama 3.3 70B via OpenRouter — all on one page, one click.

## Tech Stack

| Layer | Tool |
|-------|------|
| Backend | FastAPI + LangChain |
| A/B LLM | Groq (LLaMA 3.1 8B Instant) |
| Promote LLM | Llama 3.3 70B via OpenRouter |
| Database | Supabase |
| Frontend (test) | Streamlit |
| Frontend (prod) | React + Vite + Tailwind |

## Quick Start

### 1. Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### 2. React Frontend
```bash
cd frontend-react
npm install
npm run dev
```

Open http://localhost:5173

### 3. Streamlit Frontend (testing only)
```bash
cd frontend-streamlit
pip install -r requirements.txt
streamlit run app.py
```

## Environment Variables

Copy `.env.example` to `.env` in the project root and fill in your keys:
```
GROQ_API_KEY=
OPENROUTER_API_KEY=
SUPABASE_URL=
SUPABASE_KEY=
GROQ_MODEL=llama-3.1-8b-instant
PROMOTE_MODEL=meta-llama/llama-3.3-70b-instruct:free
```

## Deployment

- **Backend** → Render (free tier)
- **React Frontend** → Vercel (free tier)

See [DEPLOY_SPEC.md](./DEPLOY_SPEC.md) for full deployment instructions.
