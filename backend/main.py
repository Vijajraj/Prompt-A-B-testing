import os
import asyncio
import logging
from typing import Optional
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv, find_dotenv

# Load env variables from parent folder or current folder
load_dotenv(find_dotenv())

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import project modules
from feature_extractor import extract_features
from scorer import (
    score_responses,
    get_scorer_mode,
    get_active_scorer,
    model_exists,
    reload_model,
    load_model,
    MODEL_PATH,
)

# Initialize Supabase client
from supabase import create_client, Client

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
MODEL_BUCKET = os.getenv("MODEL_BUCKET", "model-artifacts")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Initialize LangChain models
from langchain_groq import ChatGroq
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
PROMOTE_MODEL = os.getenv("PROMOTE_MODEL", "meta-llama/llama-3.3-70b-instruct:free")

# Validate environment setup
if not all([GROQ_API_KEY, OPENROUTER_API_KEY, SUPABASE_URL, SUPABASE_KEY]):
    logger.warning(
        "One or more environment variables are missing! "
        "Ensure GROQ_API_KEY, OPENROUTER_API_KEY, SUPABASE_URL, and SUPABASE_KEY are defined."
    )

# Groq client for A/B runs
chat_groq = ChatGroq(model=GROQ_MODEL, groq_api_key=GROQ_API_KEY)


# ---------------------------------------------------------------------------
# App lifecycle — download model from Supabase Storage on startup
# ---------------------------------------------------------------------------

async def _download_model_from_storage():
    """Download scorer.pkl from Supabase Storage if not present locally."""
    if MODEL_PATH.exists():
        logger.info(f"Local model already exists at {MODEL_PATH}")
        return

    try:
        MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
        data = supabase.storage.from_(MODEL_BUCKET).download("scorer.pkl")
        if data:
            MODEL_PATH.write_bytes(data)
            logger.info(f"Downloaded scorer.pkl from Supabase Storage → {MODEL_PATH}")
            reload_model()
        else:
            logger.info("No scorer.pkl found in Supabase Storage (first run)")
    except Exception as e:
        logger.info(f"Could not download model from Storage (may not exist yet): {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """App startup/shutdown lifecycle."""
    # Startup: try to download model from Supabase Storage
    await _download_model_from_storage()
    load_model()
    yield
    # Shutdown: nothing to clean up


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Prompt A/B Testing Dashboard API",
    description=(
        "Backend for running A/B experiments on Groq, scoring with Judge LLM or ML model, "
        "logging to Supabase, and promoting to Llama 3.3 70B via OpenRouter."
    ),
    version="5.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Request/Response schemas
# ---------------------------------------------------------------------------

class RunRequest(BaseModel):
    prompt_a: str
    prompt_b: str
    prompt_c: str
    query: str


class PromoteRequest(BaseModel):
    log_id: Optional[str] = None
    winning_prompt: str
    query: str
    model: Optional[str] = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _escape_braces(text: str) -> str:
    """Escape curly braces in user text so LangChain doesn't treat them as template variables."""
    return text.replace("{", "{{").replace("}", "}}")


async def run_prompt_variant(prompt_text: str, query_text: str) -> str:
    """Runs a single prompt variant against the user query on Groq."""
    safe_prompt = _escape_braces(prompt_text)
    prompt_template = ChatPromptTemplate.from_messages([
        ("system", safe_prompt),
        ("human", "{query}")
    ])
    chain = prompt_template | chat_groq | StrOutputParser()
    return await chain.ainvoke({"query": query_text})


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/")
def health_check():
    return {
        "status": "ok",
        "message": "Prompt A/B Testing Dashboard API is running.",
        "scorer": get_active_scorer(),
        "scorer_mode": get_scorer_mode(),
        "model_exists": model_exists(),
    }


@app.post("/api/run")
async def run_ab_test(req: RunRequest):
    logger.info("Received /api/run request.")

    # Step 1: Run all 3 variants on Groq simultaneously
    try:
        response_a, response_b, response_c = await asyncio.gather(
            run_prompt_variant(req.prompt_a, req.query),
            run_prompt_variant(req.prompt_b, req.query),
            run_prompt_variant(req.prompt_c, req.query),
        )
    except Exception as e:
        logger.error(f"Error calling Groq: {e}")
        raise HTTPException(status_code=500, detail=f"Groq API call failed: {str(e)}")

    # Step 2: Score responses (judge LLM or ML model, based on SCORER env)
    try:
        scores, scorer_used = await score_responses(
            query=req.query,
            prompt_a=req.prompt_a, response_a=response_a,
            prompt_b=req.prompt_b, response_b=response_b,
            prompt_c=req.prompt_c, response_c=response_c,
        )
        score_a, reason_a = scores[0]["score"], scores[0]["reason"]
        score_b, reason_b = scores[1]["score"], scores[1]["reason"]
        score_c, reason_c = scores[2]["score"], scores[2]["reason"]
    except Exception as e:
        logger.error(f"Error during scoring: {e}")
        score_a, reason_a = 5.0, "Scoring failed. Default score applied."
        score_b, reason_b = 5.0, "Scoring failed. Default score applied."
        score_c, reason_c = 5.0, "Scoring failed. Default score applied."
        scorer_used = "error"

    # Step 3: Determine winner
    scores_map = {"A": score_a, "B": score_b, "C": score_c}
    winner = max(scores_map, key=scores_map.get)
    winning_prompt = (
        req.prompt_a if winner == "A"
        else req.prompt_b if winner == "B"
        else req.prompt_c
    )

    # Step 4: Log to Supabase ab_logs
    log_id = None
    try:
        db_res = supabase.table("ab_logs").insert({
            "prompt_a": req.prompt_a,
            "prompt_b": req.prompt_b,
            "prompt_c": req.prompt_c,
            "query": req.query,
            "response_a": response_a,
            "response_b": response_b,
            "response_c": response_c,
            "score_a": score_a,
            "score_b": score_b,
            "score_c": score_c,
            "winner": winner,
        }).execute()

        if db_res.data:
            log_id = db_res.data[0]["id"]
            logger.info(f"Successfully logged run to Supabase with ID: {log_id}")
    except Exception as e:
        logger.error(f"Error inserting log to Supabase: {e}")

    # Step 5: Extract features and save to training_data table
    try:
        variants_data = [
            ("A", req.prompt_a, response_a, score_a),
            ("B", req.prompt_b, response_b, score_b),
            ("C", req.prompt_c, response_c, score_c),
        ]
        training_rows = []
        features_list = []
        for variant, prompt, response, score in variants_data:
            features = extract_features(response, prompt, req.query)
            features_list.append(features)
            training_rows.append({
                "log_id": log_id,
                "variant": variant,
                "word_count": features["word_count"],
                "sentence_count": features["sentence_count"],
                "avg_sent_length": features["avg_sent_length"],
                "has_bullets": features["has_bullets"],
                "readability": features["readability"],
                "prompt_length": features["prompt_length"],
                "query_length": features["query_length"],
                "prompt_style": features["prompt_style"],
                "score": score,
            })

        if log_id:
            supabase.table("training_data").insert(training_rows).execute()
            logger.info(f"Saved {len(training_rows)} feature rows to training_data")
    except Exception as e:
        logger.error(f"Error saving training data: {e}")

    return {
        "log_id": log_id,
        "scorer_used": scorer_used,
        "results": [
            {"variant": "A", "prompt": req.prompt_a, "response": response_a, "score": score_a, "reason": reason_a},
            {"variant": "B", "prompt": req.prompt_b, "response": response_b, "score": score_b, "reason": reason_b},
            {"variant": "C", "prompt": req.prompt_c, "response": response_c, "score": score_c, "reason": reason_c},
        ],
        "winner": winner,
        "winning_prompt": winning_prompt,
    }


@app.post("/api/promote")
async def promote_winner(req: PromoteRequest):
    logger.info(f"Received /api/promote request for log_id: {req.log_id}")

    selected_model = req.model or PROMOTE_MODEL
    logger.info(f"Promoting using model: {selected_model}")

    try:
        chat_model = ChatOpenAI(
            model=selected_model,
            base_url="https://openrouter.ai/api/v1",
            api_key=OPENROUTER_API_KEY,
        )

        safe_prompt = _escape_braces(req.winning_prompt)
        prompt_template = ChatPromptTemplate.from_messages([
            ("system", safe_prompt),
            ("human", "{query}")
        ])
        chain = prompt_template | chat_model | StrOutputParser()

        final_output = await chain.ainvoke({"query": req.query})
    except Exception as e:
        logger.error(f"Error calling OpenRouter: {e}")
        raise HTTPException(status_code=500, detail=f"OpenRouter API call failed: {str(e)}")

    # Update Supabase log with final output
    if req.log_id:
        try:
            supabase.table("ab_logs").update({
                "final_output": final_output
            }).eq("id", req.log_id).execute()
            logger.info(f"Updated log {req.log_id} with final output from OpenRouter.")
        except Exception as e:
            logger.error(f"Error updating Supabase with final output: {e}")

    return {
        "model": selected_model,
        "final_output": final_output,
    }


@app.get("/api/logs")
def get_logs():
    try:
        db_res = (
            supabase.table("ab_logs")
            .select("*")
            .order("created_at", desc=True)
            .limit(50)
            .execute()
        )
        return db_res.data
    except Exception as e:
        logger.error(f"Error fetching logs from Supabase: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch logs: {str(e)}")


@app.get("/api/stats")
def get_stats():
    """Return aggregate stats: avg scores per variant, total runs, scorer info."""
    try:
        db_res = supabase.table("ab_logs").select("score_a, score_b, score_c, winner").execute()
        rows = db_res.data or []
        total = len(rows)

        if total == 0:
            return {
                "total_runs": 0,
                "avg_score_a": 0, "avg_score_b": 0, "avg_score_c": 0,
                "wins": {"A": 0, "B": 0, "C": 0},
                "scorer_mode": get_scorer_mode(),
                "active_scorer": get_active_scorer(),
            }

        avg_a = sum(r.get("score_a", 0) or 0 for r in rows) / total
        avg_b = sum(r.get("score_b", 0) or 0 for r in rows) / total
        avg_c = sum(r.get("score_c", 0) or 0 for r in rows) / total
        wins = {"A": 0, "B": 0, "C": 0}
        for r in rows:
            w = r.get("winner", "")
            if w in wins:
                wins[w] += 1

        return {
            "total_runs": total,
            "avg_score_a": round(avg_a, 2),
            "avg_score_b": round(avg_b, 2),
            "avg_score_c": round(avg_c, 2),
            "wins": wins,
            "scorer_mode": get_scorer_mode(),
            "active_scorer": get_active_scorer(),
        }
    except Exception as e:
        logger.error(f"Error fetching stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/train")
async def trigger_training():
    """Trigger model training. Runs ml/train.py as a subprocess."""
    import subprocess

    python_exe = os.getenv("PYTHON_EXE", "python")
    train_script = Path(__file__).parent.parent / "ml" / "train.py"

    if not train_script.exists():
        raise HTTPException(status_code=404, detail="Training script not found at ml/train.py")

    try:
        result = subprocess.run(
            [python_exe, str(train_script)],
            capture_output=True,
            text=True,
            timeout=300,
            cwd=str(Path(__file__).parent.parent),
            env={**os.environ},
        )

        output = result.stdout + result.stderr

        if result.returncode != 0:
            logger.error(f"Training failed: {output}")
            return {
                "status": "error",
                "message": "Training failed",
                "output": output,
            }

        # Reload model after training
        reload_model()

        return {
            "status": "success",
            "message": "Model trained and registered successfully",
            "output": output,
        }
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="Training timed out (5 min)")
    except Exception as e:
        logger.error(f"Error running training: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/model/status")
def get_model_status():
    """Return current model information."""
    import json

    status = {
        "exists": model_exists(),
        "scorer_mode": get_scorer_mode(),
        "active_scorer": get_active_scorer(),
        "model_path": str(MODEL_PATH),
    }

    # Check for training metadata
    meta_path = MODEL_PATH.parent / "metadata.json"
    if meta_path.exists():
        try:
            meta = json.loads(meta_path.read_text())
            status.update(meta)
        except Exception:
            pass

    # Check training data count
    try:
        count_res = supabase.table("training_data").select("id", count="exact").execute()
        status["training_rows"] = count_res.count if count_res.count else 0
    except Exception:
        status["training_rows"] = "unknown"

    return status


@app.get("/api/drift-report")
async def get_drift_report():
    """Fetch the latest Evidently drift report from Supabase Storage."""
    try:
        data = supabase.storage.from_(MODEL_BUCKET).download("drift_report.html")
        if data:
            from fastapi.responses import HTMLResponse
            return HTMLResponse(content=data.decode("utf-8"), media_type="text/html")
        else:
            return {"status": "no_report", "message": "No drift report found. Run monitoring/drift_check.py first."}
    except Exception as e:
        logger.info(f"No drift report available: {e}")
        return {"status": "no_report", "message": f"No drift report available: {str(e)}"}


@app.get("/api/mlflow/runs")
def get_mlflow_runs():
    """Return recent MLflow experiment runs."""
    try:
        import mlflow

        tracking_uri = os.getenv("MLFLOW_TRACKING_URI", "./mlruns")
        mlflow.set_tracking_uri(tracking_uri)

        experiment = mlflow.get_experiment_by_name("prompt-ab-scorer")
        if not experiment:
            return {"runs": [], "message": "No MLflow experiment found. Train a model first."}

        runs = mlflow.search_runs(
            experiment_ids=[experiment.experiment_id],
            max_results=20,
            order_by=["start_time DESC"],
        )

        runs_list = []
        for _, row in runs.iterrows():
            run_data = {
                "run_id": row.get("run_id", ""),
                "status": row.get("status", ""),
                "start_time": str(row.get("start_time", "")),
                "end_time": str(row.get("end_time", "")),
            }
            # Add metrics
            for col in runs.columns:
                if col.startswith("metrics."):
                    metric_name = col.replace("metrics.", "")
                    val = row[col]
                    if val is not None and str(val) != "nan":
                        run_data[f"metric_{metric_name}"] = round(float(val), 4)
                elif col.startswith("params."):
                    param_name = col.replace("params.", "")
                    val = row[col]
                    if val is not None and str(val) != "nan":
                        run_data[f"param_{param_name}"] = str(val)
            runs_list.append(run_data)

        return {"runs": runs_list}
    except Exception as e:
        logger.error(f"Error fetching MLflow runs: {e}")
        return {"runs": [], "message": f"Could not fetch MLflow runs: {str(e)}"}
