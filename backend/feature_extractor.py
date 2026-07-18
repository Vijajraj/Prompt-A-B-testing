"""
Feature Extractor — Extracts 8 numeric features from a prompt response.

Used by:
- scorer.py (ML scoring mode)
- main.py (saving features to training_data table)
- ml/train.py (training the Random Forest model)

Features:
  1. word_count      — total words in response
  2. sentence_count  — number of sentences
  3. avg_sent_length — words per sentence
  4. has_bullets     — 1 if response uses bullet points
  5. readability     — Flesch reading ease score
  6. prompt_length   — word count of system prompt
  7. query_length    — word count of user query
  8. prompt_style    — 0=formal, 1=bullets, 2=simple
"""

import re
import textstat


# Feature names in the order expected by the ML model
FEATURE_NAMES = [
    "word_count",
    "sentence_count",
    "avg_sent_length",
    "has_bullets",
    "readability",
    "prompt_length",
    "query_length",
    "prompt_style",
]


def _count_sentences(text: str) -> int:
    """Count sentences by splitting on sentence-ending punctuation."""
    sentences = re.split(r'[.!?]+', text.strip())
    # Filter out empty strings from the split
    sentences = [s.strip() for s in sentences if s.strip()]
    return max(len(sentences), 1)


def _detect_bullets(text: str) -> int:
    """Detect if response uses bullet points or list formatting."""
    bullet_patterns = [
        r'^\s*[-•*]\s',     # dash, bullet, asterisk at start of line
        r'^\s*\d+[.)]\s',   # numbered list (1. or 1))
        r'^\s*[a-z][.)]\s', # lettered list (a. or a))
    ]
    for line in text.split('\n'):
        for pattern in bullet_patterns:
            if re.match(pattern, line):
                return 1
    return 0


def _classify_prompt_style(prompt: str) -> int:
    """
    Classify prompt style:
      0 = formal (mentions formal, professional, academic, sentences)
      1 = bullets (mentions bullet, list, point, number)
      2 = simple (mentions simple, easy, everyday, casual, plain)
    """
    prompt_lower = prompt.lower()

    bullet_keywords = ['bullet', 'list', 'point', 'number', 'enumerate', 'items']
    simple_keywords = ['simple', 'easy', 'everyday', 'casual', 'plain', 'beginner', 'eli5']
    formal_keywords = ['formal', 'professional', 'academic', 'sentence', 'concise', 'brief']

    bullet_score = sum(1 for kw in bullet_keywords if kw in prompt_lower)
    simple_score = sum(1 for kw in simple_keywords if kw in prompt_lower)
    formal_score = sum(1 for kw in formal_keywords if kw in prompt_lower)

    scores = {'bullets': bullet_score, 'simple': simple_score, 'formal': formal_score}
    best = max(scores, key=scores.get)

    if scores[best] == 0:
        return 0  # default to formal if no keywords matched

    return {'formal': 0, 'bullets': 1, 'simple': 2}[best]


def extract_features(response: str, prompt: str, query: str) -> dict:
    """
    Extract 8 numeric features from a response + its prompt/query context.

    Args:
        response: The LLM-generated response text.
        prompt:   The system prompt that generated this response.
        query:    The user query sent to the LLM.

    Returns:
        Dictionary with 8 feature keys matching FEATURE_NAMES.
    """
    word_count = len(response.split())
    sentence_count = _count_sentences(response)
    avg_sent_length = round(word_count / sentence_count, 2) if sentence_count > 0 else 0.0

    try:
        readability = textstat.flesch_reading_ease(response)
    except Exception:
        readability = 50.0  # neutral default if textstat fails

    return {
        "word_count": word_count,
        "sentence_count": sentence_count,
        "avg_sent_length": avg_sent_length,
        "has_bullets": _detect_bullets(response),
        "readability": round(readability, 2),
        "prompt_length": len(prompt.split()),
        "query_length": len(query.split()),
        "prompt_style": _classify_prompt_style(prompt),
    }


def features_to_vector(features: dict) -> list:
    """Convert feature dict to ordered list for ML model input."""
    return [features[name] for name in FEATURE_NAMES]
