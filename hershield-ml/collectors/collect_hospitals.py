"""
Download all hospitals in Noida from OpenStreetMap
and save them as GeoJSON.

Run:
python collectors/collect_hospitals.py
"""

from pathlib import Path
import osmnx as ox

# ----------------------------
# Config
# ----------------------------

PLACE = "Noida, Uttar Pradesh, India"

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)

OUTPUT_FILE = DATA_DIR / "hospitals.geojson"

# ----------------------------
# Download
# ----------------------------

def main():

    print("=" * 60)
    print("Downloading Hospitals...")
    print("=" * 60)

    tags = {
        "amenity": "hospital"
    }

    try:

        gdf = ox.features_from_place(
            PLACE,
            tags
        )

        if gdf.empty:
            print("No hospitals found.")
            return

        keep_columns = []

        for col in [
            "name",
            "amenity",
            "geometry"
        ]:

            if col in gdf.columns:
                keep_columns.append(col)

        gdf = gdf[keep_columns]

        gdf = gdf.drop_duplicates()

        gdf.to_file(
            OUTPUT_FILE,
            driver="GeoJSON"
        )

        print()
        print("Saved Successfully")
        print(f"Total Hospitals : {len(gdf)}")
        print(f"Location : {OUTPUT_FILE}")

    except Exception as e:

        print()
        print("Download Failed")
        print(e)


if __name__ == "__main__":
    main()