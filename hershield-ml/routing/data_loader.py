"""
Load external GIS datasets used for route safety scoring.
"""

from pathlib import Path
import geopandas as gpd
import pandas as pd

# ----------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data"

HOSPITAL_FILE = DATA_DIR / "hospitals.geojson"
POLICE_FILE = DATA_DIR / "police.geojson"
SIGNAL_FILE = DATA_DIR / "traffic_signals.geojson"
CRIME_FILE = DATA_DIR / "crime.csv"

# ----------------------------------------------------


def load_hospitals():

    print("Loading Hospitals...")

    if not HOSPITAL_FILE.exists():
        raise FileNotFoundError(
            f"Hospital dataset not found: {HOSPITAL_FILE}"
        )

    return gpd.read_file(HOSPITAL_FILE)


# ----------------------------------------------------


def load_police():

    print("Loading Police Stations...")

    if not POLICE_FILE.exists():
        raise FileNotFoundError(
            f"Police dataset not found: {POLICE_FILE}"
        )

    return gpd.read_file(POLICE_FILE)


# ----------------------------------------------------


def load_signals():

    print("Loading Traffic Signals...")

    if not SIGNAL_FILE.exists():
        raise FileNotFoundError(
            f"Traffic signal dataset not found: {SIGNAL_FILE}"
        )

    return gpd.read_file(SIGNAL_FILE)


# ----------------------------------------------------


def load_crime():

    print("Loading Crime Dataset...")

    # File missing
    if not CRIME_FILE.exists():
        return pd.DataFrame(
            columns=[
                "lat",
                "lon",
                "crime_score"
            ]
        )

    # File exists but empty
    if CRIME_FILE.stat().st_size == 0:
        return pd.DataFrame(
            columns=[
                "lat",
                "lon",
                "crime_score"
            ]
        )

    try:
        return pd.read_csv(CRIME_FILE)

    except pd.errors.EmptyDataError:
        return pd.DataFrame(
            columns=[
                "lat",
                "lon",
                "crime_score"
            ]
        )