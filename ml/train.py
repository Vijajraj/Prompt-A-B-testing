import os
import sys
import logging
from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv())

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))
from feature_extractor import FEATURE_NAMES

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
    if not supabase_url or not supabase_key:
        logger.error("SUPABASE_URL and SUPABASE_KEY must be set")
        sys.exit(1)
        
    supabase = create_client(supabase_url, supabase_key)
    
    logger.info("Fetching data from Supabase...")
    response = supabase.table("training_data").select("*").execute()
    data = response.data
    
    if len(data) < 30:
        logger.warning(f"Not enough data: {len(data)} rows. Minimum is 30. Exiting.")
        sys.exit(0)
        
    df = pd.DataFrame(data)
    
    if set(FEATURE_NAMES) - set(df.columns):
        logger.warning("Some features are missing in training data.")
        
    X = df[FEATURE_NAMES]
    y = df["score"]
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    dagshub_user = os.environ.get("DAGSHUB_USERNAME")
    dagshub_token = os.environ.get("DAGSHUB_TOKEN")
    if dagshub_user and dagshub_token:
        import dagshub
        dagshub.init(repo_owner=dagshub_user, repo_name='prompt-ab-scorer', mlflow=True)
        
    mlflow_tracking_uri = os.environ.get("MLFLOW_TRACKING_URI", "./mlruns")
    mlflow.set_tracking_uri(mlflow_tracking_uri)
    mlflow.set_experiment('prompt-ab-scorer')
    
    n_estimators = 100
    
    with mlflow.start_run():
        logger.info("Training model...")
        model = RandomForestRegressor(n_estimators=n_estimators, random_state=42)
        model.fit(X_train, y_train)
        
        preds = model.predict(X_test)
        
        mae = mean_absolute_error(y_test, preds)
        rmse = np.sqrt(mean_squared_error(y_test, preds))
        r2 = r2_score(y_test, preds)
        
        mlflow.log_param("n_estimators", n_estimators)
        mlflow.log_param("max_depth", None)
        mlflow.log_param("training_size", len(X_train))
        
        mlflow.log_metric("MAE", mae)
        mlflow.log_metric("RMSE", rmse)
        mlflow.log_metric("R2", r2)
        mlflow.log_metric("training_size", len(X_train))
        
        importances = model.feature_importances_
        for name, imp in zip(FEATURE_NAMES, importances):
            mlflow.log_metric(f"importance_{name}", imp)
            
        mlflow.sklearn.log_model(model, "model", registered_model_name='prompt-scorer')
        
        os.makedirs("models", exist_ok=True)
        model_path = "models/scorer.pkl"
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
        meta_path = "models/metadata.json"
        with open(meta_path, "w") as f:
            json.dump(metadata, f, indent=2)
        logger.info(f"Metadata saved to {meta_path}")
        
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
            logger.error(f"Failed to upload model to Supabase: {e}")

if __name__ == "__main__":
    main()
