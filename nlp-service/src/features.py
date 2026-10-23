import os

import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import FeatureUnion
from sklearn.preprocessing import LabelEncoder

from config import MODEL_DIR


def build_features_transformer(
    max_word_features: int = 5000,
    max_char_features: int = 5000,
) -> FeatureUnion:
    """Combines word-level n-grams and character-level subword n-grams for typo resilience."""
    return FeatureUnion(
        [
            (
                "word",
                TfidfVectorizer(
                    ngram_range=(1, 2),
                    max_features=max_word_features,
                    sublinear_tf=True,
                    min_df=1,
                    max_df=0.98,
                    analyzer="word",
                    strip_accents="unicode",
                    token_pattern=r"\b[a-zA-Z][a-zA-Z\-]+\b",
                ),
            ),
            (
                "char_wb",
                TfidfVectorizer(
                    ngram_range=(3, 5),
                    max_features=max_char_features,
                    sublinear_tf=True,
                    min_df=2,
                    max_df=0.98,
                    analyzer="char_wb",
                    strip_accents="unicode",
                ),
            ),
        ]
    )


def build_tfidf_vectorizer(
    ngram_range: tuple = (1, 2),
    max_features: int = 8000,
    sublinear_tf: bool = True,
    min_df: int = 1,
    max_df: float = 0.98,
) -> FeatureUnion:
    return build_features_transformer(
        max_word_features=max_features // 2,
        max_char_features=max_features // 2,
    )


def save_encoder(encoder: LabelEncoder, name: str):
    os.makedirs(MODEL_DIR, exist_ok=True)
    path = os.path.join(MODEL_DIR, f"{name}.pkl")
    joblib.dump(encoder, path)
    print(f"Saved encoder -> {path}")


def load_encoder(name: str) -> LabelEncoder:
    path = os.path.join(MODEL_DIR, f"{name}.pkl")
    return joblib.load(path)
