import os
import sys
import logging
from pathlib import Path
from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv())

# Add backend directory to sys.path
PROJECT_ROOT = Path(__file__).parent.parent.absolute()
BACKEND_DIR = PROJECT_ROOT / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from feature_extractor import FEATURE_NAMES, extract_features
from bootstrap_data import generate_synthetic_bootstrap_data

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import mlflow
import joblib
from supabase import create_client

def main():
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)

    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_KEY")
    supabase = None
    if supabase_url and supabase_key:
        try:
            supabase = create_client(supabase_url, supabase_key)
        except Exception as e:
            logger.warning(f"Could not connect to Supabase: {e}")
        
    data = []
    
    # 1. Try fetching from training_data table
    if supabase:
        logger.info("Fetching training data from Supabase training_data table...")
        try:
            response = supabase.table("training_data").select("*").execute()
            data = response.data or []
        except Exception as e:
            logger.warning(f"Could not fetch from training_data table (table may not exist in Supabase yet): {e}")

    # 2. If training_data table missing/empty, try fetching from ab_logs table
    if len(data) < 10 and supabase:
        logger.info("Checking Supabase ab_logs table for training samples...")
        try:
            logs_res = supabase.table("ab_logs").select("*").execute()
            logs = logs_res.data or []
            for r in logs:
                query = r.get("query", "")
                for var, p_key, r_key, s_key in [
                    ("A", "prompt_a", "response_a", "score_a"),
                    ("B", "prompt_b", "response_b", "score_b"),
                    ("C", "prompt_c", "response_c", "score_c"),
                ]:
                    resp = r.get(r_key)
                    prompt = r.get(p_key)
                    score = r.get(s_key)
                    if resp and prompt and score is not None:
                        feats = extract_features(resp, prompt, query)
                        feats["score"] = float(score)
                        data.append(feats)
        except Exception as e:
            logger.warning(f"Could not fetch from ab_logs table: {e}")

    # 3. If still less than 30 rows, generate synthetic bootstrap records in memory
    if len(data) < 30:
        logger.info(f"Using synthetic bootstrap feature dataset ({len(data)} existing rows -> 80 total).")
        synthetic_records = generate_synthetic_bootstrap_data(80)
        data.extend(synthetic_records)
        
        # Try saving synthetic records to Supabase training_data table if table exists
        if supabase:
            try:
                supabase.table("training_data").insert(synthetic_records).execute()
                logger.info("Saved synthetic bootstrap records to Supabase training_data table.")
            except Exception as e:
                logger.info(f"Note: Supabase table 'training_data' not created yet. Training proceeds in-memory: {e}")

    df = pd.DataFrame(data)
    
    # Ensure all feature columns exist
    missing_cols = set(FEATURE_NAMES) - set(df.columns)
    if missing_cols:
        for col in missing_cols:
            df[col] = 0.0
        
    X = df[FEATURE_NAMES]
    y = df["score"]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Initialize MLflow tracking with absolute path to project root mlruns
    os.environ["MLFLOW_ALLOW_FILE_STORE"] = "true"
    mlruns_dir = PROJECT_ROOT / "mlruns"
    mlruns_dir.mkdir(parents=True, exist_ok=True)
    
    dagshub_user = os.environ.get("DAGSHUB_USERNAME")
    dagshub_token = os.environ.get("DAGSHUB_TOKEN")
    if dagshub_user and dagshub_token:
        try:
            import dagshub
            dagshub.init(repo_owner=dagshub_user, repo_name='prompt-ab-scorer', mlflow=True)
        except Exception as e:
            logger.warning(f"DagsHub init skipped: {e}")
            
    mlflow_tracking_uri = str(mlruns_dir.as_uri())
    mlflow.set_tracking_uri(mlflow_tracking_uri)
    mlflow.set_experiment('prompt-ab-scorer')
    
    n_estimators = 100
    
    with mlflow.start_run():
        logger.info("Training Random Forest Regressor model...")
        model = RandomForestRegressor(n_estimators=n_estimators, random_state=42)
        model.fit(X_train, y_train)
        
        preds = model.predict(X_test)
        
        mae = float(mean_absolute_error(y_test, preds))
        rmse = float(np.sqrt(mean_squared_error(y_test, preds)))
        r2 = float(r2_score(y_test, preds)) if len(y_test) > 1 else 1.0
        
        mlflow.log_param("n_estimators", n_estimators)
        mlflow.log_param("max_depth", None)
        mlflow.log_param("training_size", len(X_train))
        
        mlflow.log_metric("MAE", mae)
        mlflow.log_metric("RMSE", rmse)
        mlflow.log_metric("R2", r2)
        mlflow.log_metric("training_size", len(X_train))
        
        importances = model.feature_importances_
        for name, imp in zip(FEATURE_NAMES, importances):
            mlflow.log_metric(f"importance_{name}", float(imp))
            
        try:
            mlflow.sklearn.log_model(model, "model", registered_model_name='prompt-scorer')
        except Exception as e:
            logger.warning(f"MLflow sklearn model logging notice: {e}")
        
        models_dir = PROJECT_ROOT / "models"
        models_dir.mkdir(parents=True, exist_ok=True)
        model_path = models_dir / "scorer.pkl"
        joblib.dump(model, model_path)
        logger.info(f"Model saved locally to {model_path}")
        
        # Save metadata for /api/model/status endpoint
        import json
        from datetime import datetime, timezone
        metadata = {
            "mae": round(mae, 4),
            "rmse": round(rmse, 4),
            "r2": round(r2, 4),
            "training_size": len(X_train),
            "test_size": len(X_test),
            "n_estimators": n_estimators,
            "last_trained": datetime.now(timezone.utc).isoformat(),
            "feature_importances": {
                name: round(float(imp), 4)
                for name, imp in zip(FEATURE_NAMES, importances)
            },
        }
        meta_path = models_dir / "metadata.json"
        with open(meta_path, "w") as f:
            json.dump(metadata, f, indent=2)
        logger.info(f"Metadata saved to {meta_path}")
        
        if supabase:
            bucket = os.environ.get("MODEL_BUCKET", "model-artifacts")
            try:
                with open(model_path, "rb") as f:
                    supabase.storage.from_(bucket).upload(
                        file=f,
                        path="scorer.pkl",
                        file_options={"cacheControl": "3600", "upsert": "true"}
                    )
                logger.info(f"Model uploaded to Supabase bucket '{bucket}'")
            except Exception as e:
                logger.info(f"Supabase Storage upload notice (bucket 'model-artifacts' not created yet): {e}")

    # Generate Evidently drift report automatically after training
    try:
        monitoring_dir = PROJECT_ROOT / "monitoring"
        sys.path.insert(0, str(monitoring_dir))
        import drift_check
        drift_check.generate_report_silently()
        logger.info("Generated Evidently drift report successfully.")
    except Exception as e:
        logger.info(f"Drift check notice: {e}")

    print(f"Training Complete. MAE: {mae:.4f}, R2: {r2:.4f}, Sample Size: {len(X_train)}")

if __name__ == "__main__":
    main()
