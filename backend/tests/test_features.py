import sys, os
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from feature_extractor import extract_features, features_to_vector, FEATURE_NAMES

def test_extract_features_keys():
    features = extract_features("This is a response", "Prompt", "Query")
    for name in FEATURE_NAMES:
        assert name in features

def test_word_count():
    features = extract_features("One two three four.", "Prompt", "Query")
    assert features["word_count"] == 4

def test_sentence_count():
    features = extract_features("First sentence. Second sentence!", "Prompt", "Query")
    assert features["sentence_count"] == 2

def test_has_bullets_true():
    features = extract_features("- item 1\n- item 2", "Prompt", "Query")
    assert features["has_bullets"] == 1

def test_has_bullets_false():
    features = extract_features("No bullets here.", "Prompt", "Query")
    assert features["has_bullets"] == 0

def test_prompt_style():
    features = extract_features("Response", "Write a summary", "Query")
    assert features["prompt_style"] in [0, 1, 2]

def test_features_to_vector():
    features = extract_features("Response", "Prompt", "Query")
    vec = features_to_vector(features)
    assert len(vec) == 8
    assert isinstance(vec, list)

def test_readability():
    features = extract_features("This is easy to read.", "Prompt", "Query")
    assert isinstance(features["readability"], float)
