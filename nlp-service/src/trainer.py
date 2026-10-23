import json
import os
from datetime import datetime, timezone

import joblib
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import VotingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import LabelEncoder
from sklearn.svm import LinearSVC

from config import DATA_PATH, MODEL_DIR, TEST_DATA_PATH, TRAIN_DATA_PATH
from src.features import build_features_transformer
from src.preprocessor import batch_clean

os.makedirs(MODEL_DIR, exist_ok=True)


def load_data(path: str) -> pd.DataFrame:
    df = pd.read_csv(path)
    required = {"text", "category", "priority"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"Dataset missing columns: {missing}")
    df = df.dropna(subset=["text", "category", "priority"])
    df["text"] = df["text"].astype(str).str.strip()
    df = df[df["text"].str.len() > 5]
    print(f"Loaded {len(df)} valid records")
    return df


def preprocess_data(df: pd.DataFrame) -> pd.DataFrame:
    print("Cleaning text...")
    df = df.copy()
    df["clean_text"] = batch_clean(df["text"].tolist())
    df = df[df["clean_text"].str.strip().str.len() > 0]
    print(f"After preprocessing: {len(df)} records")
    return df


def save_processed_splits(df: pd.DataFrame):
    train_df, test_df = train_test_split(
        df,
        test_size=0.2,
        random_state=42,
        stratify=df["category"],
    )
    os.makedirs(os.path.dirname(TRAIN_DATA_PATH), exist_ok=True)
    train_df.to_csv(TRAIN_DATA_PATH, index=False)
    test_df.to_csv(TEST_DATA_PATH, index=False)
    print(f"Saved train split -> {TRAIN_DATA_PATH}")
    print(f"Saved test split -> {TEST_DATA_PATH}")


def build_ensemble_classifier(random_state: int = 42) -> VotingClassifier:
    """Builds a robust voting ensemble: Calibrated LinearSVC + LogisticRegression + MultinomialNB."""
    clf_svm = CalibratedClassifierCV(
        LinearSVC(C=1.0, class_weight="balanced", random_state=random_state, max_iter=2000),
        cv=3,
    )
    clf_lr = LogisticRegression(
        C=2.0,
        max_iter=1000,
        solver="lbfgs",
        class_weight="balanced",
        random_state=random_state,
    )
    clf_nb = MultinomialNB(alpha=0.1)

    return VotingClassifier(
        estimators=[
            ("svm", clf_svm),
            ("lr", clf_lr),
            ("nb", clf_nb),
        ],
        voting="soft",
        weights=[2, 2, 1],
    )


def train_category_model(df: pd.DataFrame) -> tuple:
    le = LabelEncoder()
    y = le.fit_transform(df["category"])
    x = df["clean_text"]

    x_train, x_test, y_train, y_test = train_test_split(
        x,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y,
    )

    pipeline = Pipeline(
        [
            ("tfidf", build_features_transformer(max_word_features=6000, max_char_features=6000)),
            ("clf", build_ensemble_classifier(random_state=42)),
        ]
    )

    print("Fitting Ensemble Category Classifier...")
    pipeline.fit(x_train, y_train)

    cv_scores = cross_val_score(
        pipeline,
        x,
        y,
        cv=StratifiedKFold(n_splits=5, shuffle=True, random_state=42),
        scoring="f1_weighted",
        n_jobs=-1,
    )
    print(f"Category CV F1 scores: {cv_scores.round(3)} | Mean: {cv_scores.mean():.3f}")

    y_pred = pipeline.predict(x_test)
    report = classification_report(y_test, y_pred, target_names=le.classes_, output_dict=True)

    print("\nCategory Classification Report:")
    print(classification_report(y_test, y_pred, target_names=le.classes_))

    return pipeline, le, report, cv_scores.mean()


def train_priority_model(df: pd.DataFrame) -> tuple:
    le = LabelEncoder()
    y = le.fit_transform(df["priority"])
    x = df["clean_text"]

    x_train, x_test, y_train, y_test = train_test_split(
        x,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y,
    )

    pipeline = Pipeline(
        [
            ("tfidf", build_features_transformer(max_word_features=4000, max_char_features=4000)),
            ("clf", build_ensemble_classifier(random_state=42)),
        ]
    )

    print("\nFitting Ensemble Priority Classifier...")
    pipeline.fit(x_train, y_train)

    cv_scores = cross_val_score(
        pipeline,
        x,
        y,
        cv=StratifiedKFold(n_splits=5, shuffle=True, random_state=42),
        scoring="f1_weighted",
        n_jobs=-1,
    )
    print(f"Priority CV F1 scores: {cv_scores.round(3)} | Mean: {cv_scores.mean():.3f}")

    y_pred = pipeline.predict(x_test)
    report = classification_report(y_test, y_pred, target_names=le.classes_, output_dict=True)

    print("\nPriority Classification Report:")
    print(classification_report(y_test, y_pred, target_names=le.classes_))

    return pipeline, le, report, cv_scores.mean()


def save_models(
    cat_pipeline,
    cat_le,
    pri_pipeline,
    pri_le,
    cat_report,
    pri_report,
    cat_cv,
    pri_cv,
):
    joblib.dump(cat_pipeline, os.path.join(MODEL_DIR, "category_model.pkl"))
    joblib.dump(pri_pipeline, os.path.join(MODEL_DIR, "priority_model.pkl"))
    joblib.dump(cat_le, os.path.join(MODEL_DIR, "label_encoder_cat.pkl"))
    joblib.dump(pri_le, os.path.join(MODEL_DIR, "label_encoder_pri.pkl"))

    metadata = {
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "category_model": {
            "cv_f1_weighted": round(float(cat_cv), 4),
            "test_accuracy": round(float(cat_report["accuracy"]), 4),
            "classes": cat_le.classes_.tolist(),
            "report": cat_report,
        },
        "priority_model": {
            "cv_f1_weighted": round(float(pri_cv), 4),
            "test_accuracy": round(float(pri_report["accuracy"]), 4),
            "classes": pri_le.classes_.tolist(),
            "report": pri_report,
        },
    }

    with open(os.path.join(MODEL_DIR, "model_metadata.json"), "w", encoding="utf-8") as file:
        json.dump(metadata, file, indent=2)

    print(f"\nAll models saved to {MODEL_DIR}")
    print(json.dumps(metadata, indent=2))


def main():
    print("=== Training Enhanced Zero-Cost Ensemble NLP Model ===")
    df = load_data(DATA_PATH)
    df = preprocess_data(df)
    save_processed_splits(df)

    cat_pipeline, cat_le, cat_report, cat_cv = train_category_model(df)
    pri_pipeline, pri_le, pri_report, pri_cv = train_priority_model(df)

    save_models(
        cat_pipeline,
        cat_le,
        pri_pipeline,
        pri_le,
        cat_report,
        pri_report,
        cat_cv,
        pri_cv,
    )
    print("\nTraining completed successfully!")


if __name__ == "__main__":
    main()
