import os
import sys
import logging
from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv())

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))
from feature_extractor import extract_features

from supabase import create_client
from datasets import load_dataset

def main():
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)

    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_KEY")
    if not supabase_url or not supabase_key:
        logger.error("SUPABASE_URL and SUPABASE_KEY must be set")
        sys.exit(1)
        
    supabase = create_client(supabase_url, supabase_key)
    
    logger.info("Checking existing rows...")
    response = supabase.table("training_data").select("id", count="exact").limit(1).execute()
    count = response.count
    
    if count is not None and count >= 100:
        logger.info(f"Table already has {count} rows. Exiting.")
        sys.exit(0)
        
    logger.info("Downloading dataset...")
    dataset = load_dataset('mteb/summeval', split='test')
    
    rows_added = 0
    records = []
    
    for row in dataset:
        coherence = row['coherence']
        consistency = row['consistency']
        fluency = row['fluency']
        relevance = row['relevance']
        text = row['machine_summaries'][0] if isinstance(row['machine_summaries'], list) else row['machine_summaries']
        
        score_1_5 = (coherence + consistency + fluency + relevance) / 4.0
        score = score_1_5 * 2.0
        
        features = extract_features(text, "Summarize this", "Summary")
        features['score'] = score
        records.append(features)
        
        if len(records) >= 100:
            break
            
    if records:
        try:
            supabase.table("training_data").insert(records).execute()
            rows_added = len(records)
        except Exception as e:
            logger.error(f"Error inserting: {e}")
            
    logger.info(f"Added {rows_added} rows to training_data.")

if __name__ == "__main__":
    main()
