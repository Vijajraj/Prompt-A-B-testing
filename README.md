# Prompt A/B Testing Dashboard

A production-ready LLMOps playground to test, score, auto-promote, and log system prompt templates using **FastAPI**, **Streamlit**, **Supabase**, **Groq (llama3-8b-8192)**, and **OpenRouter (llama-3.3-70b)**.

## Architecture & Flow

1. **User Input**: Enter three system prompt variants (A, B, C) and a user query in the Streamlit UI.
2. **FastAPI (`/api/run`)**:
   - Sends the query combined with prompts A, B, and C to Groq simultaneously (using `asyncio.gather` for performance).
   - Feeds all three outputs to a Judge LLM on Groq to score them from 1 to 10 based on Clarity, Conciseness, and Helpfulness.
   - Logs the inputs, outputs, scores, and winner in Supabase.
3. **FastAPI (`/api/promote`)**:
   - Takes the winning prompt variant and executes it on **Llama 3.3 70B via OpenRouter**.
   - Updates the Supabase execution log with the final output.
4. **Display**: Shows side-by-side responses with their scores and reasoning, highlights the winner, and prints the final output on the Streamlit dashboard.

---

## Tech Stack

- **Backend**: FastAPI, LangChain, Pydantic, Supabase-py
- **Frontend**: Streamlit, Pandas, Requests
- **Databases**: Supabase (PostgreSQL)
- **Models**:
  - A/B Testing: `llama3-8b-8192` (Groq)
  - Judge Model: `llama3-8b-8192` (Groq)
  - Promote Model: `meta-llama/llama-3.3-70b-instruct:free` (OpenRouter)

---

## Setup & Run Instructions

### 1. Database Setup
Run the following SQL snippet in your **Supabase SQL Editor**:
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

### 2. Environment Variables
Create a `.env` file in the root directory (based on `.env.example`):
```env
GROQ_API_KEY=your_groq_api_key
OPENROUTER_API_KEY=your_openrouter_api_key
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
GROQ_MODEL=llama3-8b-8192
PROMOTE_MODEL=meta-llama/llama-3.3-70b-instruct:free
```

### 3. Installation
Create a virtual environment and install dependencies:
```bash
python -m venv .venv
.\.venv\Scripts\activate

# Install backend dependencies
pip install -r backend/requirements.txt

# Install frontend dependencies
pip install -r frontend/requirements.txt
```

### 4. Running the Application
Open two terminal windows/tabs:

* **Terminal 1: Start FastAPI Backend**
  ```bash
  cd backend
  ..\.venv\Scripts\uvicorn main:app --reload
  ```
  Backend will run on `http://localhost:8000`. You can inspect the Swagger documentation at `http://localhost:8000/docs`.

* **Terminal 2: Start Streamlit Frontend**
  ```bash
  cd frontend
  ..\.venv\Scripts\streamlit run app.py
  ```
  Streamlit will run on `http://localhost:8501`.
