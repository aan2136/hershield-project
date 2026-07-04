"""
api/scream_detector.py

Flask blueprint exposing POST /detect-scream, backed by the real
RandomForest model trained by training/train_scream_model.py. No fake
predictions, no random confidence values — every response comes from
model.predict_proba() on features extracted from the uploaded audio.
"""

from __future__ import annotations

import os
from typing import Optional, Tuple

import joblib
import numpy as np
from flask import Blueprint, jsonify, request
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder

from utils.audio_features import AudioFeatureError, extract_features_from_bytes

scream_detector_bp = Blueprint("scream_detector", __name__)

_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
MODEL_PATH = os.path.join(_PROJECT_ROOT, "models", "scream_model.pkl")
LABEL_ENCODER_PATH = os.path.join(_PROJECT_ROOT, "models", "label_encoder.pkl")

SCREAM_LABEL = "SCREAM"
SCREAM_DECISION_THRESHOLD = 0.97

# Model + label encoder are loaded once at import time and cached here.
_model: Optional[RandomForestClassifier] = None
_label_encoder: Optional[LabelEncoder] = None
_scream_class_index: Optional[int] = None
_load_error: Optional[str] = None


def _load_artifacts() -> None:
    """Load the trained model and label encoder from disk, once."""
    global _model, _label_encoder, _scream_class_index, _load_error

    if _model is not None and _label_encoder is not None:
        return

    if not os.path.isfile(MODEL_PATH) or not os.path.isfile(LABEL_ENCODER_PATH):
        _load_error = (
            "Scream detection model not found. "
            "Run training/train_scream_model.py to generate "
            "models/scream_model.pkl and models/label_encoder.pkl."
        )
        return

    try:
        model = joblib.load(MODEL_PATH)
        label_encoder = joblib.load(LABEL_ENCODER_PATH)
        scream_index = list(label_encoder.classes_).index(SCREAM_LABEL)
    except Exception as exc:  # noqa: BLE001
        _load_error = f"Failed to load scream detection model: {exc}"
        return

    _model = model
    _label_encoder = label_encoder
    _scream_class_index = scream_index
    _load_error = None


def _predict(audio_bytes: bytes, filename: str) -> Tuple[bool, float]:
    """
    Extract features from raw audio bytes and run the real model's
    predict_proba() to obtain the scream-class probability.

    Raises:
        AudioFeatureError: if the audio cannot be decoded/processed.
    """
    suffix = os.path.splitext(filename)[1] or ".webm"
    features = extract_features_from_bytes(audio_bytes, suffix=suffix)

    assert _model is not None and _scream_class_index is not None

    probabilities = _model.predict_proba(features.reshape(1, -1))[0]
    scream_probability = float(probabilities[_scream_class_index])
    is_scream = scream_probability >= 0.97

    return is_scream, scream_probability


@scream_detector_bp.route("/detect-scream", methods=["POST"])
def detect_scream():
    """
    POST /detect-scream
    multipart/form-data, field "audio" -> audio blob.

    Returns:
        200: {"scream": bool, "confidence": float}
        400: {"error": "..."}  (missing/invalid/corrupted audio)
        500: {"error": "..."}  (model not available)
    """
    _load_artifacts()

    if _load_error is not None:
        return jsonify({"error": _load_error}), 500

    if "audio" not in request.files:
        return jsonify({"error": "Missing 'audio' field in form-data."}), 400

    audio_file = request.files["audio"]
    if audio_file.filename == "":
        return jsonify({"error": "Empty audio file."}), 400

    try:
        audio_bytes = audio_file.read()
        is_scream, confidence = _predict(audio_bytes, audio_file.filename)
    except AudioFeatureError as exc:
        return jsonify({"error": f"Invalid or corrupted audio: {exc}"}), 400
    except Exception as exc:  # noqa: BLE001 - never crash the server
        return jsonify({"error": f"Prediction failed: {exc}"}), 500

    return jsonify({"scream": bool(is_scream), "confidence": round(confidence, 4)}), 200
