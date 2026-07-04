"""
training/train_scream_model.py

Trains a real RandomForestClassifier scream-detection model from the
audio files under dataset/scream (label SCREAM) and dataset/noscream
(label NORMAL). No synthetic data, no fake metrics.

Run from the hershield-ml project root:
    python training/train_scream_model.py
"""

from __future__ import annotations

import os
import sys
from typing import List, Tuple

import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from tqdm import tqdm

# Allow running this script directly (python training/train_scream_model.py)
# from the project root by making sure the project root is on sys.path so
# `utils` can be imported.
_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

from utils.audio_features import AudioFeatureError, extract_features  # noqa: E402

SUPPORTED_EXTENSIONS: Tuple[str, ...] = (
    ".wav",
    ".ogg",
    ".mp3",
    ".flac",
    ".aiff",
    ".aif",
)

DATASET_DIR = os.path.join(_PROJECT_ROOT, "dataset")
SCREAM_DIR = os.path.join(DATASET_DIR, "scream")
NOSCREAM_DIR = os.path.join(DATASET_DIR, "noscream")

MODELS_DIR = os.path.join(_PROJECT_ROOT, "models")
MODEL_PATH = os.path.join(MODELS_DIR, "scream_model.pkl")
LABEL_ENCODER_PATH = os.path.join(MODELS_DIR, "label_encoder.pkl")

SCREAM_LABEL = "SCREAM"
NORMAL_LABEL = "NORMAL"

RANDOM_STATE = 42
TEST_SIZE = 0.2


def _list_audio_files(directory: str) -> List[str]:
    """Return absolute paths of all supported audio files in a directory."""
    if not os.path.isdir(directory):
        return []

    files: List[str] = []
    for name in sorted(os.listdir(directory)):
        if name.lower().endswith(SUPPORTED_EXTENSIONS):
            files.append(os.path.join(directory, name))
    return files


def _build_dataset() -> Tuple[np.ndarray, np.ndarray]:
    """
    Scan dataset/scream and dataset/noscream, extract real audio features
    for every valid file, and return (X, y) as numpy arrays. Corrupted or
    unreadable files are skipped with a warning.
    """
    scream_files = _list_audio_files(SCREAM_DIR)
    noscream_files = _list_audio_files(NOSCREAM_DIR)

    if not scream_files:
        raise RuntimeError(f"No audio files found in {SCREAM_DIR}")
    if not noscream_files:
        raise RuntimeError(f"No audio files found in {NOSCREAM_DIR}")

    labeled_files: List[Tuple[str, str]] = (
        [(path, SCREAM_LABEL) for path in scream_files]
        + [(path, NORMAL_LABEL) for path in noscream_files]
    )

    features: List[np.ndarray] = []
    labels: List[str] = []
    skipped = 0

    for path, label in tqdm(labeled_files, desc="Extracting features"):
        try:
            vector = extract_features(path)
        except AudioFeatureError as exc:
            print(f"[SKIP] {path}: {exc}")
            skipped += 1
            continue
        except Exception as exc:  # noqa: BLE001 - never let one bad file kill the run
            print(f"[SKIP] {path}: unexpected error: {exc}")
            skipped += 1
            continue

        features.append(vector)
        labels.append(label)

    print(
        f"\nLoaded {len(features)} usable clips "
        f"({len(scream_files)} scream, {len(noscream_files)} noscream, "
        f"{skipped} skipped)."
    )

    if len(features) < 2:
        raise RuntimeError("Not enough valid audio files to train a model.")

    return np.vstack(features), np.array(labels)


def _print_metrics(y_true: np.ndarray, y_pred: np.ndarray, label_encoder: LabelEncoder) -> None:
    """Print accuracy, precision, recall, F1, confusion matrix, and report."""
    scream_index = list(label_encoder.classes_).index(SCREAM_LABEL)

    accuracy = accuracy_score(y_true, y_pred)
    precision = precision_score(y_true, y_pred, pos_label=scream_index, zero_division=0)
    recall = recall_score(y_true, y_pred, pos_label=scream_index, zero_division=0)
    f1 = f1_score(y_true, y_pred, pos_label=scream_index, zero_division=0)

    print("\n===== Evaluation on held-out test set =====")
    print(f"Accuracy : {accuracy:.4f}")
    print(f"Precision: {precision:.4f}")
    print(f"Recall   : {recall:.4f}")
    print(f"F1 Score : {f1:.4f}")

    print("\nConfusion Matrix:")
    print(confusion_matrix(y_true, y_pred))

    print("\nClassification Report:")
    print(
        classification_report(
            y_true, y_pred, target_names=list(label_encoder.classes_)
        )
    )


def main() -> None:
    print(f"Scanning dataset:\n  scream:   {SCREAM_DIR}\n  noscream: {NOSCREAM_DIR}\n")

    X, y_raw = _build_dataset()

    label_encoder = LabelEncoder()
    y = label_encoder.fit_transform(y_raw)

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=TEST_SIZE,
        random_state=RANDOM_STATE,
        stratify=y,
    )

    print(f"\nTraining RandomForestClassifier on {X_train.shape[0]} samples "
          f"({X_train.shape[1]} features)...")

    model = RandomForestClassifier(
        n_estimators=300,
        max_depth=None,
        random_state=RANDOM_STATE,
        n_jobs=-1,
        class_weight="balanced",
    )
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    _print_metrics(y_test, y_pred, label_encoder)

    os.makedirs(MODELS_DIR, exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    joblib.dump(label_encoder, LABEL_ENCODER_PATH)

    print(f"\nSaved model -> {MODEL_PATH}")
    print(f"Saved label encoder -> {LABEL_ENCODER_PATH}")


if __name__ == "__main__":
    main()
