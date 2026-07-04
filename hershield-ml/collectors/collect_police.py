"""
Download all police stations in Noida from OpenStreetMap.

Run:
python collectors/collect_police.py
"""

from pathlib import Path
import osmnx as ox

# --------------------------------------------------

PLACE = "Noida, Uttar Pradesh, India"

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)

OUTPUT_FILE = DATA_DIR / "police.geojson"

# --------------------------------------------------

def main():

    print("=" * 60)
    print("Downloading Police Stations...")
    print("=" * 60)

    tags = {
        "amenity": "police"
    }

    try:

        gdf = ox.features_from_place(
            PLACE,
            tags
        )

        if gdf.empty:
            print("No police stations found.")
            return

        keep = []

        for col in [

            "name",

            "amenity",

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
        print(f"Police Stations : {len(gdf)}")
        print(f"Saved To : {OUTPUT_FILE}")

    except Exception as e:

        print(e)


if __name__ == "__main__":
    main()