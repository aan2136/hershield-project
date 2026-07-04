"""
Download all traffic signals in Noida from OpenStreetMap.

Run:
python collectors/collect_signals.py
"""

from pathlib import Path
import osmnx as ox

# --------------------------------------------------

PLACE = "Noida, Uttar Pradesh, India"

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)

OUTPUT_FILE = DATA_DIR / "traffic_signals.geojson"

# --------------------------------------------------

def main():

    print("=" * 60)
    print("Downloading Traffic Signals...")
    print("=" * 60)

    tags = {
        "highway": "traffic_signals"
    }

    try:

        gdf = ox.features_from_place(
            PLACE,
            tags
        )

        if gdf.empty:
            print("No traffic signals found.")
            return

        keep = []

        for col in [

            "highway",

            "geometry"

        ]:

            if col in gdf.columns:

                keep.append(col)

        gdf = gdf[keep]

        gdf = gdf.drop_duplicates()

        gdf.to_file(

            OUTPUT_FILE,

            driver="GeoJSON"

        )

        print()
        print("Saved Successfully")
        print(f"Traffic Signals : {len(gdf)}")
        print(f"Saved To : {OUTPUT_FILE}")

    except Exception as e:

        print(e)


if __name__ == "__main__":
    main()