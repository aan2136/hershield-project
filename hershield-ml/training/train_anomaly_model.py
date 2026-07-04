"""
Train and save the anomaly detection model (IsolationForest).
Run once: python train_anomaly_model.py
"""

import logging
import os

import joblib
import numpy as np
from sklearn.ensemble import IsolationForest

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(PROJECT_ROOT, "models", "anomaly_model.pkl")


def _generate_training_data(n_samples: int = 20000) -> np.ndarray:
    """Simulate normal walking/journey patterns for training."""
    rng = np.random.default_rng(42)

    speed = rng.normal(12, 6, n_samples).clip(0, 80)
    gps_deviation = rng.normal(15, 2, n_samples).clip(0, 50)
    heading = rng.uniform(0, 360, n_samples)
    stop_duration = rng.exponential(2, n_samples).clip(0, 180)
    acceleration = rng.normal(0, 1.5, n_samples).clip(-3, 3)

    heading_sin = np.sin(np.radians(heading))
    heading_cos = np.cos(np.radians(heading))

    return np.column_stack(
        [
            speed,
            gps_deviation,
            heading_sin,
            heading_cos,
            stop_duration,
            acceleration,
            speed * gps_deviation,
            np.abs(acceleration),
        ]
    )


def train_and_save() -> None:
    print("Generating training data for normal journey patterns...")
    X = _generate_training_data()

    model = IsolationForest(
        n_estimators=300,
        contamination=0.03,
        max_samples="auto",
        n_jobs=-1,
        random_state=42,
    )
    model.fit(X)
    print("Training Complete")

    print("Saving Model...")
    os.makedirs(
        os.path.dirname(MODEL_PATH),
        exist_ok=True
    )
    joblib.dump(model, MODEL_PATH)
    print(f"Anomaly model saved to {MODEL_PATH}")
    print("Done.")


if __name__ == "__main__":
    train_and_save()

# NOTE (future work, not yet implemented):
# - Add hour / weather / weekday-weekend features once frontend & backend
#   are ready to supply them.
# - Retrain on real Noida journey logs instead of synthetic data.