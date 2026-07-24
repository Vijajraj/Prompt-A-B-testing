import os
import sys
import logging
from pathlib import Path
from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv())

PROJECT_ROOT = Path(__file__).parent.parent.absolute()
BACKEND_DIR = PROJECT_ROOT / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from feature_extractor import FEATURE_NAMES

import pandas as pd
from supabase import create_client
from evidently.report import Report
from evidently.metric_preset import DataDriftPreset

def generate_report_silently():
    """Generate Evidently drift report and save to project root and Supabase Storage."""
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_KEY")
    if not supabase_url or not supabase_key:
        return False
        
    supabase = create_client(supabase_url, supabase_key)
    
    response = supabase.table("training_data").select("*").order("created_at", desc=False).execute()
    data = response.data or []
    
    if len(data) < 10:
        return False
        
    df = pd.DataFrame(data)
    for col in FEATURE_NAMES:
        if col not in df.columns:
            df[col] = 0.0
            
    df = df[FEATURE_NAMES]
    
    split_idx = max(1, int(len(df) * 0.8))
    ref_df = df.iloc[:split_idx]
    curr_df = df.iloc[split_idx:] if len(df) > split_idx else df
    
    report = Report(metrics=[DataDriftPreset()])
    report.run(reference_data=ref_df, current_data=curr_df)
    
    report_path = PROJECT_ROOT / "drift_report.html"
    report.save_html(str(report_path))
    
    bucket = os.environ.get("MODEL_BUCKET", "model-artifacts")
    try:
        with open(report_path, "rb") as f:
            supabase.storage.from_(bucket).upload(
                file=f,
                path="drift_report.html",
                file_options={"cacheControl": "3600", "upsert": "true"}
            )
    except Exception:
        pass
        
    return True

def main():
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)

    success = generate_report_silently()
    if not success:
        logger.warning("Not enough data or credentials missing to generate drift report.")
        sys.exit(0)
    else:
        logger.info("Evidently drift report generated successfully.")
        sys.exit(0)

if __name__ == "__main__":
    main()
