import json
import os
import re

import joblib
import numpy as np

from config import MODEL_DIR
from src.preprocessor import clean_text

MODEL_CATEGORY_MAP = {
    "Electricity": "Electrical",
    "Water": "Plumbing",
    "Network": "IT",
    "Sanitation": "Cleaning",
    "Furniture": "Maintenance",
}

CATEGORY_KEYWORDS = [
    (
        "Electrical",
        {
            "fire",
            "smoke",
            "burning",
            "electricity",
            "electrical",
            "power",
            "power cut",
            "power outage",
            "no electricity",
            "short circuit",
            "spark",
            "sparking",
            "shock",
            "electric shock",
            "electrocution",
            "exposed wire",
            "wire",
            "wiring",
            "switch",
            "switchboard",
            "socket",
            "outlet",
            "breaker",
            "mcb",
            "inverter",
            "generator",
            "voltage",
            "voltage fluctuation",
            "light",
            "tube light",
            "tubelight",
            "bulb",
            "led",
            "fan",
            "ceiling fan",
            "regulator",
            "ac",
            "air conditioner",
            "cooling",
            "geyser",
            "immersion rod",
            "plug point",
            "extension box",
            "fuse",
            "flickering",
            "blackout",
        },
    ),
    (
        "Plumbing",
        {
            "water",
            "no water",
            "water not coming",
            "drinking water",
            "water cooler",
            "purifier",
            "ro water",
            "ro purifier",
            "tap",
            "pipe",
            "leak",
            "leaking",
            "leakage",
            "burst pipe",
            "burst",
            "flood",
            "flooding",
            "overflow",
            "drain",
            "drainage",
            "choke",
            "choked",
            "clog",
            "clogged",
            "flush",
            "flush tank",
            "commode",
            "urinal",
            "sewer",
            "sewage",
            "faucet",
            "health faucet",
            "shower",
            "pipeline",
            "overhead tank",
            "washbasin",
            "wash basin",
        },
    ),
    (
        "IT",
        {
            "wifi",
            "wi-fi",
            "internet",
            "network",
            "server",
            "login",
            "portal",
            "student portal",
            "website",
            "app",
            "software",
            "computer",
            "pc",
            "lab pc",
            "printer",
            "projector",
            "hdmi",
            "rfid",
            "biometric",
            "attendance machine",
            "system error",
            "password",
            "lan",
            "ethernet",
            "blue screen",
            "keyboard",
            "mouse",
            "monitor",
            "display",
            "scanner",
            "mac address",
            "captive portal",
        },
    ),
    (
        "Cleaning",
        {
            "cleaning",
            "clean",
            "dirty",
            "garbage",
            "trash",
            "waste",
            "dustbin",
            "smell",
            "stink",
            "stinking",
            "odor",
            "odour",
            "hygiene",
            "sanitation",
            "sanitary",
            "pad",
            "napkin",
            "mosquito",
            "pest",
            "rat",
            "cockroach",
            "graffiti",
            "sweep",
            "sweeping",
            "mop",
            "mopping",
            "spill",
            "spilled",
            "algae",
            "fungus",
            "mold",
            "scrub",
            "scrubbing",
            "dust",
            "unhygienic",
        },
    ),
    (
        "Maintenance",
        {
            "broken",
            "repair",
            "damaged",
            "furniture",
            "chair",
            "bench",
            "desk",
            "table",
            "door",
            "window",
            "lock",
            "latch",
            "handle",
            "hinge",
            "key",
            "ceiling",
            "roof",
            "wall",
            "floor",
            "tile",
            "lift",
            "elevator",
            "staircase",
            "stairs",
            "handrail",
            "railing",
            "step",
            "cracked",
            "plaster",
            "seepage",
            "dampness",
            "peeling",
            "whiteboard",
            "blackboard",
            "podium",
            "locker",
            "infrastructure",
            "gate",
            "cupboard",
            "almirah",
        },
    ),
    (
        "Administration",
        {
            "fee",
            "fees",
            "fee receipt",
            "receipt",
            "scholarship",
            "certificate",
            "bonafide",
            "exam",
            "examination",
            "timetable",
            "schedule",
            "attendance",
            "hall ticket",
            "admit card",
            "id card",
            "identity card",
            "bus pass",
            "transport bus",
            "food quality",
            "mess food",
            "canteen food",
            "document verification",
            "admission",
            "library card",
            "library fine",
            "book return",
            "fine",
            "warden",
            "hostel fee",
        },
    ),
]

SAFETY_CRITICAL_CATEGORY_KEYWORDS = {
    "Electrical": {"fire", "smoke", "short circuit", "electric shock", "electrocution", "exposed wire"},
    "Plumbing": {"burst pipe", "sewage leak", "gas leak"},
}

HIGH_KEYWORDS = {
    "fire",
    "smoke",
    "flood",
    "flooding",
    "short circuit",
    "electric shock",
    "electrocution",
    "shock",
    "collapse",
    "collapsed",
    "emergency",
    "urgent",
    "danger",
    "dangerous",
    "hazard",
    "hazardous",
    "injury",
    "injured",
    "burning",
    "burst",
    "burst pipe",
    "overflow",
    "sewage leak",
    "gas leak",
    "exposed wire",
    "contaminated",
    "food poisoning",
    "accident",
}

LOW_KEYWORDS = {
    "suggestion",
    "suggest",
    "request",
    "recommend",
    "improvement",
    "minor",
    "small",
    "convenience",
    "would be nice",
    "if possible",
}

HIGH_CONTEXT_PATTERNS = (
    re.compile(
        r"\b(no water|water not coming|no electricity|power outage|internet down|network down)\b"
        r".*\b(entire|whole|all|hostel|building|block|campus|exam|lab|server|urgent|emergency)\b"
    ),
    re.compile(
        r"\b(entire|whole|all|hostel|building|block|campus|exam|lab|server|urgent|emergency)\b"
        r".*\b(no water|water not coming|no electricity|power outage|internet down|network down)\b"
    ),
)


def _contains_keyword(text_lower: str, keyword: str) -> bool:
    pattern = re.escape(keyword).replace(r"\ ", r"\s+")
    return re.search(rf"(?<![a-z0-9]){pattern}(?![a-z0-9])", text_lower) is not None


def _matches_any(text_lower: str, keywords: set[str]) -> bool:
    return any(_contains_keyword(text_lower, keyword) for keyword in keywords)


def _keyword_category(text_lower: str) -> str | None:
    for category, keywords in CATEGORY_KEYWORDS:
        if _matches_any(text_lower, keywords):
            return category
    return None


def _keyword_category_scores(text_lower: str) -> dict[str, int]:
    scores = {}
    for category, keywords in CATEGORY_KEYWORDS:
        count = sum(1 for kw in keywords if _contains_keyword(text_lower, kw))
        if count > 0:
            scores[category] = count
    return scores


def _canonical_category(category: str) -> str:
    return MODEL_CATEGORY_MAP.get(category, category)


def _keyword_priority(text_lower: str) -> str | None:
    if _matches_any(text_lower, HIGH_KEYWORDS) or any(
        pattern.search(text_lower) for pattern in HIGH_CONTEXT_PATTERNS
    ):
        return "HIGH"

    if _matches_any(text_lower, LOW_KEYWORDS):
        return "LOW"

    return None


class Predictor:
    def __init__(self):
        self.cat_pipeline = None
        self.pri_pipeline = None
        self.cat_encoder = None
        self.pri_encoder = None
        self.metadata = None
        self._loaded = False

    def load(self):
        self.cat_pipeline = joblib.load(os.path.join(MODEL_DIR, "category_model.pkl"))
        self.pri_pipeline = joblib.load(os.path.join(MODEL_DIR, "priority_model.pkl"))
        self.cat_encoder = joblib.load(os.path.join(MODEL_DIR, "label_encoder_cat.pkl"))
        self.pri_encoder = joblib.load(os.path.join(MODEL_DIR, "label_encoder_pri.pkl"))

        meta_path = os.path.join(MODEL_DIR, "model_metadata.json")
        self.metadata = None

        if os.path.exists(meta_path):
            with open(meta_path, encoding="utf-8") as file:
                self.metadata = json.load(file)

        self._loaded = True
        print("Models loaded successfully")

    def reload(self):
        self._loaded = False
        self.load()
        print("Models reloaded")

    def predict(self, text: str) -> dict:
        if not self._loaded:
            raise RuntimeError("Models not loaded. Call predictor.load() first.")

        if not text or not text.strip():
            return {
                "category": "Other",
                "priority": "MEDIUM",
                "category_confidence": 0.0,
                "priority_confidence": 0.0,
                "override_applied": False,
            }

        clean = clean_text(text)
        text_lower = text.lower()

        cat_proba = self.cat_pipeline.predict_proba([clean])[0]
        cat_idx = int(np.argmax(cat_proba))
        cat_conf = float(cat_proba[cat_idx])
        category = _canonical_category(self.cat_encoder.inverse_transform([cat_idx])[0])

        pri_proba = self.pri_pipeline.predict_proba([clean])[0]
        pri_idx = int(np.argmax(pri_proba))
        pri_conf = float(pri_proba[pri_idx])
        priority = self.pri_encoder.inverse_transform([pri_idx])[0]

        override_applied = False

        # 1. Check safety critical category override
        safety_override = None
        for cat, kws in SAFETY_CRITICAL_CATEGORY_KEYWORDS.items():
            if _matches_any(text_lower, kws):
                safety_override = cat
                break

        if safety_override and safety_override != category:
            category = safety_override
            cat_conf = 0.98
            override_applied = True
        elif cat_conf < 0.55:
            scores = _keyword_category_scores(text_lower)
            if scores:
                best_kw_cat = max(scores.items(), key=lambda item: item[1])[0]
                if best_kw_cat != category:
                    category = best_kw_cat
                    cat_conf = 0.85
                    override_applied = True

        # 2. Priority rules
        keyword_priority = _keyword_priority(text_lower)

        if keyword_priority == "HIGH":
            priority = "HIGH"
            pri_conf = 1.0
            override_applied = True
        elif keyword_priority == "LOW" and priority != "HIGH":
            priority = "LOW"
            pri_conf = 0.9
            override_applied = True

        if pri_conf < 0.45 and not override_applied:
            priority = "MEDIUM"
            override_applied = True

        return {
            "category": category,
            "priority": priority,
            "category_confidence": round(cat_conf, 4),
            "priority_confidence": round(pri_conf, 4),
            "override_applied": override_applied,
        }

    def predict_batch(self, texts: list[str]) -> list[dict]:
        return [self.predict(text) for text in texts]

    def get_top_features(self, text: str, n: int = 10) -> dict:
        if not self._loaded:
            raise RuntimeError("Models not loaded. Call predictor.load() first.")

        clean = clean_text(text)

        try:
            vectorizer = self.cat_pipeline.named_steps["tfidf"]
            clf = self.cat_pipeline.named_steps["clf"]

            tfidf_vector = vectorizer.transform([clean])
            feature_names = vectorizer.get_feature_names_out()

            cat_proba = self.cat_pipeline.predict_proba([clean])[0]
            cat_idx = int(np.argmax(cat_proba))
            category = _canonical_category(self.cat_encoder.inverse_transform([cat_idx])[0])

            # Extract weights if available across estimators
            scores = tfidf_vector.toarray()[0]
            top_indices = np.argsort(scores)[::-1][:n]

            return {
                "predicted_category": category,
                "top_features": [
                    {
                        "feature": feature_names[index],
                        "score": round(float(scores[index]), 4),
                    }
                    for index in top_indices
                    if scores[index] > 0
                ],
            }
        except Exception:
            return {
                "predicted_category": category if 'category' in locals() else "Other",
                "top_features": [],
            }


predictor = Predictor()
