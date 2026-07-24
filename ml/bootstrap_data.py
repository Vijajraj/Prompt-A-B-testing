import os
import sys
import logging
import random
from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv())

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))
from feature_extractor import extract_features

from supabase import create_client

def generate_synthetic_bootstrap_data(count=100):
    """Generate clean synthetic bootstrap feature rows if external dataset is unavailable."""
    records = []
    sample_texts = [
        ("Summary: The system executes automated prompt evaluation.", "Summarize formal", "System query"),
        ("Key takeaways:\n- First point\n- Second point\n- Third point", "Summarize bullets", "System query"),
        ("This is a simple explanation in everyday plain English.", "Summarize simple", "System query"),
        ("Detailed analysis of artificial intelligence architectures and machine learning metrics.", "Summarize formal", "AI query"),
        ("Here are the top findings:\n- Machine learning accuracy is high\n- Latency is reduced", "Summarize bullets", "AI query"),
        ("AI helps computers learn patterns from data without explicit programming.", "Summarize simple", "AI query")
    ]
    
    for i in range(count):
        base_text, prompt, query = random.choice(sample_texts)
        # Add slight variation
        varied_text = f"{base_text} (Sample instance {i+1} with {random.randint(10, 50)} additional tokens)."
        features = extract_features(varied_text, prompt, query)
        
        # Calculate realistic quality score (6.0 - 9.8) based on features
        base_score = 7.0
        if features["has_bullets"] == 1:
            base_score += 0.8
        if features["word_count"] > 15 and features["word_count"] < 80:
            base_score += 0.7
        if features["readability"] > 40:
            base_score += 0.5
        score = round(min(10.0, max(1.0, base_score + random.uniform(-0.5, 0.5))), 1)
        
        features['score'] = score
        records.append(features)
        
    return records


def main():
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)

    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_KEY")
    if not supabase_url or not supabase_key:
        logger.error("SUPABASE_URL and SUPABASE_KEY must be set")
        sys.exit(1)
        
    supabase = create_client(supabase_url, supabase_key)
    
    logger.info("Checking existing rows in training_data...")
    try:
        response = supabase.table("training_data").select("id", count="exact").execute()
        count = response.count if response.count is not None else (len(response.data) if response.data else 0)
    except Exception as e:
        logger.warning(f"Could not count training_data: {e}")
        count = 0
    
    if count >= 50:
        logger.info(f"Table already has {count} rows. Skipping bootstrap.")
        sys.exit(0)
        
    records = []
    logger.info("Attempting to download SummEval dataset...")
    try:
        from datasets import load_dataset
        dataset = load_dataset('mteb/summeval', split='test')
        for row in dataset:
            coherence = row['coherence']
            consistency = row['consistency']
            fluency = row['fluency']
            relevance = row['relevance']
            text = row['machine_summaries'][0] if isinstance(row['machine_summaries'], list) else row['machine_summaries']
            
            score_1_5 = (coherence + consistency + fluency + relevance) / 4.0
            score = round(score_1_5 * 2.0, 1)
            
            features = extract_features(text, "Summarize this text", "User input query")
            features['score'] = score
            records.append(features)
            
            if len(records) >= 100:
                break
        logger.info(f"Loaded {len(records)} rows from SummEval.")
    except Exception as e:
        logger.warning(f"Could not load HuggingFace SummEval dataset: {e}. Generating synthetic bootstrap data...")
        records = generate_synthetic_bootstrap_data(80)
        
    if records:
        try:
            supabase.table("training_data").insert(records).execute()
            logger.info(f"Successfully added {len(records)} bootstrap rows to training_data table.")
        except Exception as e:
            logger.error(f"Error inserting bootstrap records to Supabase: {e}")
            sys.exit(1)

if __name__ == "__main__":
    main()
