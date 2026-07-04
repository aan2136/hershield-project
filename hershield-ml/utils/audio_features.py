"""
utils/audio_features.py

Real audio feature extraction for the HerShield scream-detection model.
No synthetic/random features — every value is computed from the actual
waveform via librosa.
"""

from __future__ import annotations

import os
import tempfile
from typing import Optional

import numpy as np
import librosa

# Target sample rate every clip is resampled to before feature extraction.
# Fixing the sample rate guarantees a consistent feature-vector length
# regardless of the original recording's sample rate.
TARGET_SR: int = 22050

# Number of MFCC coefficients to compute.
N_MFCC: int = 13

# Minimum number of audio samples required to attempt extraction.
# Anything shorter is almost certainly silence/corruption.
MIN_SAMPLES: int = 512


class AudioFeatureError(Exception):
    """Raised when a waveform cannot be loaded or produces no usable signal."""


def _summarize(feature_matrix: np.ndarray) -> np.ndarray:
    """
    Collapse a (n_coeff, n_frames) time-series feature matrix into a fixed
    length vector using per-coefficient mean and standard deviation across
    frames. This keeps the final feature vector length independent of clip
    duration.
    """
    mean = np.mean(feature_matrix, axis=1)
    std = np.std(feature_matrix, axis=1)
    return np.concatenate([mean, std])


def _load_waveform(path: str, target_sr: int = TARGET_SR) -> np.ndarray:
    """
    Load an audio file from disk, convert to mono, and resample to
    target_sr. librosa.load handles stereo-to-mono conversion (mono=True)
    and resampling automatically, and reads wav/ogg/mp3/flac/aiff (and,
    when ffmpeg/audioread is available, webm/opus browser recordings).
    """
    if not os.path.isfile(path):
        raise AudioFeatureError(f"File not found: {path}")

    try:
        y, _sr = librosa.load(path, sr=target_sr, mono=True)
    except Exception as exc:  # noqa: BLE001 - any decode failure is "corrupted"
        raise AudioFeatureError(f"Could not decode audio file: {exc}") from exc

    if y is None or y.size < MIN_SAMPLES:
        raise AudioFeatureError("Audio signal too short or empty.")

    if not np.isfinite(y).all():
        raise AudioFeatureError("Audio signal contains invalid (NaN/Inf) samples.")

    return y


def extract_features(path: str, sr: int = TARGET_SR) -> np.ndarray:
    """
    Extract a flat feature vector from an audio file on disk.

    Features (all real, computed via librosa):
      - MFCC (mean + std per coefficient)
      - Delta MFCC (mean + std per coefficient)
      - Delta-Delta MFCC (mean + std per coefficient)
      - Zero Crossing Rate (mean + std)
      - Spectral Centroid (mean + std)
      - Spectral Rolloff (mean + std)
      - Chroma STFT (mean + std per bin)
      - RMS Energy (mean + std)
      - Spectral Bandwidth (mean + std)
      - Spectral Contrast (mean + std per band)

    Raises:
        AudioFeatureError: if the file is missing, corrupted, silent, or
        otherwise cannot produce a valid feature vector.
    """
    y = _load_waveform(path, target_sr=sr)

    try:
        mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=N_MFCC)
        delta_mfcc = librosa.feature.delta(mfcc, order=1)
        delta2_mfcc = librosa.feature.delta(mfcc, order=2)

        zcr = librosa.feature.zero_crossing_rate(y)
        spectral_centroid = librosa.feature.spectral_centroid(y=y, sr=sr)
        spectral_rolloff = librosa.feature.spectral_rolloff(y=y, sr=sr)
        chroma = librosa.feature.chroma_stft(y=y, sr=sr)
        rms = librosa.feature.rms(y=y)
        spectral_bandwidth = librosa.feature.spectral_bandwidth(y=y, sr=sr)
        spectral_contrast = librosa.feature.spectral_contrast(y=y, sr=sr)
    except Exception as exc:  # noqa: BLE001
        raise AudioFeatureError(f"Feature extraction failed: {exc}") from exc

    feature_vector = np.concatenate(
        [
            _summarize(mfcc),
            _summarize(delta_mfcc),
            _summarize(delta2_mfcc),
            _summarize(zcr),
            _summarize(spectral_centroid),
            _summarize(spectral_rolloff),
            _summarize(chroma),
            _summarize(rms),
            _summarize(spectral_bandwidth),
            _summarize(spectral_contrast),
        ]
    ).astype(np.float64)

    if not np.isfinite(feature_vector).all():
        raise AudioFeatureError("Computed feature vector contains NaN/Inf values.")

    return feature_vector


def extract_features_from_bytes(
    audio_bytes: bytes, suffix: str = ".webm", sr: int = TARGET_SR
) -> np.ndarray:
    """
    Extract a feature vector from raw audio bytes (e.g. an uploaded blob
    from a browser MediaRecorder). Writes to a temporary file on disk
    because librosa/audioread need a real file path to decode compressed
    browser formats such as webm/opus reliably.

    Raises:
        AudioFeatureError: on empty input or any decode/extraction failure.
    """
    if not audio_bytes:
        raise AudioFeatureError("Empty audio payload.")

    tmp_path: Optional[str] = None
    try:
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp_file:
            tmp_file.write(audio_bytes)
            tmp_path = tmp_file.name

        return extract_features(tmp_path, sr=sr)
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except OSError:
                pass


def feature_vector_length() -> int:
    """
    Return the expected length of the flattened feature vector by running
    a tiny synthetic-silence probe through the real extraction pipeline.
    Useful for sanity-checking a loaded model against this pipeline's
    output shape at startup.
    """
    probe = np.zeros(TARGET_SR, dtype=np.float32)  # 1 second of silence
    probe[0] = 1e-4  # avoid an all-zero signal tripping edge cases in some features
    mfcc = librosa.feature.mfcc(y=probe, sr=TARGET_SR, n_mfcc=N_MFCC)
    delta_mfcc = librosa.feature.delta(mfcc, order=1)
    delta2_mfcc = librosa.feature.delta(mfcc, order=2)
    zcr = librosa.feature.zero_crossing_rate(probe)
    centroid = librosa.feature.spectral_centroid(y=probe, sr=TARGET_SR)
    rolloff = librosa.feature.spectral_rolloff(y=probe, sr=TARGET_SR)
    chroma = librosa.feature.chroma_stft(y=probe, sr=TARGET_SR)
    rms = librosa.feature.rms(y=probe)
    bandwidth = librosa.feature.spectral_bandwidth(y=probe, sr=TARGET_SR)
    contrast = librosa.feature.spectral_contrast(y=probe, sr=TARGET_SR)

    length = sum(
        _summarize(f).shape[0]
        for f in (
            mfcc,
            delta_mfcc,
            delta2_mfcc,
            zcr,
            centroid,
            rolloff,
            chroma,
            rms,
            bandwidth,
            contrast,
        )
    )
    return int(length)
