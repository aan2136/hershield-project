"""
Flask API routes for route prediction and anomaly detection.
"""
import logging

logger = logging.getLogger(__name__)

import os
from typing import Any

import joblib
import numpy as np
from flask import Blueprint, jsonify, request
from training.feature_builder import build_anomaly_features

from routing.route_engine import shortest_route
from routing.dynamic_risk import adjust_risk

routes_bp = Blueprint("routes", __name__)

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

ANOMALY_MODEL_PATH = os.path.join(
    PROJECT_ROOT,
    "models",
    "anomaly_model.pkl"
)

_anomaly_model = None


def _get_anomaly_model():
    global _anomaly_model
    if _anomaly_model is None:
        if not os.path.exists(ANOMALY_MODEL_PATH):
            raise FileNotFoundError(
                f"Anomaly model not found at {ANOMALY_MODEL_PATH}. "
                "Run: python training/train_anomaly_model.py"
            )
        _anomaly_model = joblib.load(ANOMALY_MODEL_PATH)
    return _anomaly_model


def _validate_coords(coords: Any, field: str) -> list[float]:
    if not isinstance(coords, (list, tuple)) or len(coords) != 2:
        raise ValueError(f"{field} must be [longitude, latitude]")
    lon, lat = float(coords[0]), float(coords[1])
    if not (-180 <= lon <= 180 and -90 <= lat <= 90):
        raise ValueError(f"{field} has invalid coordinates")
    return [lon, lat]


@routes_bp.route("/predict_route", methods=["POST"])
def predict_route():
    try:
        data = request.get_json(silent=True) or {}

        source = _validate_coords(data.get("source"), "source")
        destination = _validate_coords(data.get("destination"), "destination")
        weather = str(data.get("weather", "Clear"))

        route = shortest_route(source, destination)
        risk = adjust_risk(route["risk_score"], weather=weather)

        recommendation = route["recommendation"]
        if risk["risk_score"] > 0.55 and risk["risk_score"] <= 0.75:
            recommendation = "Moderate Risk - Stay Alert"
        elif risk["risk_score"] > 0.75:
            recommendation = "High Risk - Consider Alternate Route"

        return jsonify(
            {
                "success": True,
                "distance_km": route["distance_km"],
                "duration_min": route["duration_min"],
                "geometry": route["geometry"],
                "risk_score": risk["risk_score"],
                "safe_probability": risk["safe_probability"],
                "recommendation": recommendation,
            }
        )

    except ValueError as exc:
        return jsonify({"success": False, "message": str(exc)}), 400
    except FileNotFoundError as exc:
        return jsonify({"success": False, "message": str(exc)}), 503
    except Exception as exc:
        logger.exception(exc)
        return jsonify({"success": False, "message": str(exc)}), 500


@routes_bp.route("/detect_anomaly", methods=["POST"])
def detect_anomaly():
    try:
        data = request.get_json(silent=True) or {}

        required = ("speed", "gps_deviation", "heading", "stop_duration", "acceleration")
        missing = [f for f in required if f not in data]
        if missing:
            return jsonify(
                {"success": False, "message": f"Missing fields: {', '.join(missing)}"}
            ), 400

        features = build_anomaly_features(data)
        features = np.asarray(features, dtype=float)
        model = _get_anomaly_model()

        prediction = model.predict([features])[0]
        is_anomaly = bool(prediction == -1)

        score = 0.0
        if hasattr(model, "decision_function"):
            score = float(model.decision_function([features])[0])

        return jsonify(
            {
                "success": True,
                "anomaly": is_anomaly,
                "anomaly_score": round(score, 4),
                "message": "Anomaly detected - Emergency recommended"
                if is_anomaly
                else "Normal movement pattern",
            }
        )

    except FileNotFoundError as exc:
        return jsonify({"success": False, "message": str(exc)}), 503
    except Exception as exc:
        logger.exception(exc)
        return jsonify({"success": False, "message": str(exc)}), 500


@routes_bp.route("/health", methods=["GET"])
def health():
    graph_exists = os.path.exists(
        os.path.join(
            PROJECT_ROOT,
            "models",
            "noida_risk.graphml"
        )
    )
    model_exists = os.path.exists(ANOMALY_MODEL_PATH)
    return jsonify(
        {
            "success": True,
            "graph_loaded": graph_exists,
            "anomaly_model_loaded": model_exists,
            "status": "Healthy",
        }
    )