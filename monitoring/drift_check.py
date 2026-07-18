import os
import sys
import logging
from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv())

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))
from feature_extractor import FEATURE_NAMES

import pandas as pd
from supabase import create_client
from evidently.report import Report
from evidently.metric_preset import DataDriftPreset

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
    response = supabase.table("training_data").select("*").order("created_at", desc=False).execute()
    data = response.data
    
    if len(data) < 50:
        logger.warning("Not enough data to check drift.")
        sys.exit(0)
        
    df = pd.DataFrame(data)[FEATURE_NAMES]
    
    split_idx = int(len(df) * 0.8)
    ref_df = df.iloc[:split_idx]
    curr_df = df.iloc[-50:] if len(df) - split_idx < 50 else df.iloc[split_idx:]
    
    report = Report(metrics=[DataDriftPreset()])
    report.run(reference_data=ref_df, current_data=curr_df)
    
    report_path = "drift_report.html"
    report.save_html(report_path)
    
    bucket = os.environ.get("MODEL_BUCKET", "model-artifacts")
    try:
        with open(report_path, "rb") as f:
            supabase.storage.from_(bucket).upload(
                file=f,
                path="drift_report.html",
                file_options={"cacheControl": "3600", "upsert": "true"}
            )
        logger.info(f"Report uploaded to Supabase bucket '{bucket}'")
    except Exception as e:
        logger.error(f"Failed to upload report to Supabase: {e}")
        
    report_dict = report.as_dict()
    drift_detected = report_dict['metrics'][0]['result']['dataset_drift']
    drifted_features = report_dict['metrics'][0]['result']['drift_by_columns']
    drifted_list = [f for f, res in drifted_features.items() if res['drift_detected']]
    
    if drift_detected:
        logger.warning(f"Drift detected: yes")
        logger.warning(f"Drifted features: {drifted_list}")
        sys.exit(1)
    else:
        logger.info("Drift detected: no")
        sys.exit(0)

if __name__ == "__main__":
    main()
