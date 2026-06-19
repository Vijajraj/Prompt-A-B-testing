# Prompt A/B Testing Dashboard — SPEC v2

## What this project does

You type 3 prompt variants and a query directly in the UI.
The system tests all 3 on Groq (fast, free), scores each response
using a judge LLM, picks the winner automatically, sends it to
Llama 3.3 70B via OpenRouter, and shows the final output — all on one screen,
one click.

**Subject:** LLMOps
**Ops concepts:** prompt experimentation, auto-evaluation, cross-provider routing, auto-promotion
**Cost:** ₹0 — Groq free tier + OpenRouter free tier + Supabase free tier

---

## Tech Stack

| Layer         | Tool                        | Why                                         |
|---------------|-----------------------------|---------------------------------------------|
| A/B LLM       | Groq (LLaMA 3 8B)           | Fast, free, ideal for rapid experimentation |
| Promote LLM   | Llama 3.3 70B via OpenRouter  | Free tier, 9x bigger than test model        |
| LLM framework | LangChain                   | Clean prompt template management            |
| Backend       | FastAPI                     | Simple, fast API layer                      |
| Database      | Supabase (free tier)        | Logs every run + score                      |
| Frontend      | Streamlit                   | Single-page dashboard, no React needed      |

---

## Folder Structure

```
prompt-ab-tester/
├── backend/
│   ├── main.py              # All FastAPI routes + logic
│   └── requirements.txt
├── frontend/
│   ├── app.py               # Streamlit single-page UI
│   └── requirements.txt
├── supabase_setup.sql       # Run once in Supabase SQL editor
├── .env.example
├── SPEC.md                  # This file
└── README.md
```

No seed.py needed — prompts are typed live in the UI.

---

## Architecture — Full Flow

```
User types:
  - Prompt A  (system prompt variant 1)
  - Prompt B  (system prompt variant 2)
  - Prompt C  (system prompt variant 3)
  - Query     (the user message sent to all 3)

clicks [ Run ]
         │
         ▼
FastAPI /api/run
         │
         ├── sends all 3 to Groq simultaneously
         │   (LangChain ChatPromptTemplate + ChatGroq)
         │
         ▼
  3 responses come back
         │
         ├── judge LLM (Groq) scores each response 1–10
         │   (Clarity + Conciseness + Helpfulness)
         │
         ▼
  winner = highest scored variant
         │
         ├── logs all 3 runs to Supabase
         │
         ▼
FastAPI /api/promote
         │
         ├── takes winning prompt + same query
         ├── sends to Llama 3.3 70B via OpenRouter
         │   (LangChain ChatPromptTemplate + ChatOpenAI with OpenRouter base_url)
         │
         ▼
  Final output returned

─────────────────────────────────────────
Everything above happens in one click.
Output shown on same screen, top to bottom.
─────────────────────────────────────────
```

---

## Supabase Table

Run this once in Supabase → SQL Editor:

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

One row per full run. Stores everything — all 3 prompts, responses,
scores, winner name, and final OpenRouter output.

---

## API Endpoints

| Method | Route        | What it does                                         |
|--------|--------------|------------------------------------------------------|
| GET    | /            | Health check                                         |
| POST   | /api/run     | Test 3 prompts on Groq, score, pick winner           |
| POST   | /api/promote | Send winning prompt to Llama 3.3 70B via OpenRouter           |
| GET    | /api/logs    | Fetch recent run history for dashboard               |

### /api/run — Request + Response

```json
Request:
{
  "prompt_a": "Summarize formally in 2-3 sentences",
  "prompt_b": "Summarize as 3-5 bullet points",
  "prompt_c": "Summarize in simple everyday language",
  "query": "Paste of text to summarize..."
}

Response:
{
  "results": [
    { "variant": "A", "prompt": "...", "response": "...", "score": 7.0, "reason": "..." },
    { "variant": "B", "prompt": "...", "response": "...", "score": 9.0, "reason": "..." },
    { "variant": "C", "prompt": "...", "response": "...", "score": 6.0, "reason": "..." }
  ],
  "winner": "B",
  "winning_prompt": "Summarize as 3-5 bullet points"
}
```

### /api/promote — Request + Response

```json
Request:
{
  "winning_prompt": "Summarize as 3-5 bullet points",
  "query": "Paste of text to summarize..."
}

Response:
{
  "model": "meta-llama/llama-3.3-70b-instruct:free",
  "final_output": "• Point one...\n• Point two...\n• Point three..."
}
```

---

## Frontend — Single Page UI

Everything on one page, top to bottom in this order:

```
┌─────────────────────────────────────────────────────────┐
│  ⚡ Prompt A/B Testing Dashboard                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Prompt A  [text area]    Prompt B  [text area]         │
│                                                         │
│  Prompt C  [text area]                                  │
│                                                         │
│  Your query  [text area]                                │
│                                                         │
│  [ ▶ Run All Prompts ]                                  │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  Results (appears after clicking Run)                   │
│                                                         │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│  │ Prompt A     │ │ Prompt B 🏆  │ │ Prompt C     │   │
│  │ Response...  │ │ Response...  │ │ Response...  │   │
│  │ Score: 7/10  │ │ Score: 9/10  │ │ Score: 6/10  │   │
│  └──────────────┘ └──────────────┘ └──────────────┘   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  🏆 Winner: Prompt B → sent to Llama 3.3 70B via OpenRouter      │
│                                                         │
│  Final Output:                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │  • Point one...                                   │  │
│  │  • Point two...                                   │  │
│  │  • Point three...                                 │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  📊 Run History (collapsible table of past runs)        │
└─────────────────────────────────────────────────────────┘
```

---

## Environment Variables

```
GROQ_API_KEY=your_groq_api_key
OPENROUTER_API_KEY=your_openrouter_api_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_anon_key

GROQ_MODEL=llama3-8b-8192
PROMOTE_MODEL=meta-llama/llama-3.3-70b-instruct:free
```

Get keys:
- Groq → console.groq.com (free, no card)
- OpenRouter → openrouter.ai (free, no card, use :free models)
- Supabase → supabase.com (free 500MB)

---

## LangChain Usage

LangChain handles two things:

**1. Prompt formatting for Groq A/B runs:**
```
ChatPromptTemplate.from_messages([
    ("system", variant_template),
    ("human",  user_query)
]) | ChatGroq(model=GROQ_MODEL) | StrOutputParser()
```

**2. Promote call to OpenRouter:**
```
ChatPromptTemplate.from_messages([
    ("system", winning_prompt),
    ("human",  user_query)
]) | ChatOpenAI(
    model=PROMOTE_MODEL,
    base_url="https://openrouter.ai/api/v1",
    api_key=OPENROUTER_API_KEY
) | StrOutputParser()
```

Same LangChain pattern, different model/client. Swapping providers
is just swapping the chat model object.

---

## Build Plan

### Day 1 — Setup (2–3 hrs)
- [ ] Create Supabase project → run supabase_setup.sql
- [ ] Get Groq API key from console.groq.com
- [ ] Get OpenRouter API key from openrouter.ai
- [ ] Copy .env.example → .env, fill all 4 keys
- [ ] pip install backend requirements
- [ ] pip install frontend requirements
- [ ] Start backend: `cd backend && uvicorn main:app --reload`
- [ ] Hit GET localhost:8000 → confirm running

### Day 2 — Core A/B flow (3–4 hrs)
- [ ] Build /api/run — 3 LangChain chains on Groq
- [ ] Build judge LLM scoring inside /api/run
- [ ] Test via Swagger UI at localhost:8000/docs
- [ ] Log all 3 results to Supabase
- [ ] Build Streamlit UI — 3 prompt boxes + query box + Run button
- [ ] Show 3 responses side by side with scores

### Day 3 — Promote + polish (2–3 hrs)
- [ ] Build /api/promote — LangChain chain on OpenRouter
- [ ] Wire Streamlit to call /api/promote after /api/run
- [ ] Show final output below the 3 results
- [ ] Add run history table at the bottom
- [ ] Disable RLS on Supabase table
- [ ] End-to-end test — one full run from input to OpenRouter output
- [ ] Write README

---

## Demo Script (for presentation)

1. Open the app — show the 3 empty prompt boxes
2. Type 3 clearly different prompts (formal / bullets / simple)
3. Paste a paragraph of text as the query
4. Click Run
5. Show 3 responses appearing with scores — point out one clearly wins
6. Show the winner being sent to Llama 3.3 70B via OpenRouter automatically
7. Show the final output at the bottom
8. Say: "Groq LLaMA 3 8B handled the experimentation, Llama 3.3 70B via OpenRouter handled the
   execution. The system chose the prompt — I didn't."

---

## Stretch Goals

- Add a 4th variant box
- Let user pick the promote model from a dropdown (Llama 3.3 70B / Llama / Gemma)
- Show score trend across multiple runs in a bar chart
- Add a copy button on the final output box
