"""
Build feature vectors for anomaly detection from journey telemetry.
"""

import math
from typing import Any

import numpy as np


def build_anomaly_features(payload: dict[str, Any]) -> list[float]:
    """
    Build feature vector for anomaly model from GPS/journey data.

    Expected payload keys:
        speed, gps_deviation, heading, stop_duration, acceleration
    """
    speed = max(0.0, float(payload.get("speed", 0)))
    gps_deviation = max(0.0, float(payload.get("gps_deviation", 0)))
    heading = float(payload.get("heading", 0)) % 360
    stop_duration = max(0.0, float(payload.get("stop_duration", 0)))
    acceleration = float(payload.get("acceleration", 0))

    heading_sin = math.sin(math.radians(heading))
    heading_cos = math.cos(math.radians(heading))

    return [
        speed,
        gps_deviation,
        heading_sin,
        heading_cos,
        stop_duration,
        acceleration,
        speed * gps_deviation,
        abs(acceleration),
    ]