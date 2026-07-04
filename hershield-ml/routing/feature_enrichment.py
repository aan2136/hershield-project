"""
Enrich OSM graph edges with safety-related features for risk scoring.
"""

import logging
import os

import networkx as nx
import numpy as np
import osmnx as ox
from sklearn.neighbors import BallTree

from routing.data_loader import (
    load_hospitals,
    load_police,
    load_signals,
    load_crime,
)

logger = logging.getLogger(__name__)

EARTH_RADIUS_M = 6_371_000

PROJECT_ROOT = os.path.dirname(
    os.path.dirname(
        os.path.abspath(__file__)
    )
)

GRAPH_PATH = os.path.join(
    PROJECT_ROOT,
    "models",
    "noida_risk.graphml"
)


def _street_light_score(highway: str) -> float:
    scores = {
        "motorway": 0.20,
        "trunk": 0.25,
        "primary": 0.30,
        "secondary": 0.35,
        "tertiary": 0.40,
        "residential": 0.50,
        "living_street": 0.55,
        "service": 0.60,
        "pedestrian": 0.55,
        "footway": 0.70,
        "path": 0.80,
        "track": 0.85,
        "steps": 0.90,
        "unclassified": 0.55,
    }
    return scores.get(highway, 0.5)


def _build_tree(points):
    """
    Build a BallTree from a GeoDataFrame (geometry) or a DataFrame
    with lat/lon columns.
    """

    if points is None:
        return None

    if hasattr(points, "empty"):

        if points.empty:
            return None

        # GeoDataFrame (Hospitals / Police / Signals)
        if "geometry" in points.columns:

            geometry = points.geometry

            if geometry.is_empty.all():
                return None

            # OSM amenities aren't always Points — hospitals/police in
            # particular often come back as building Polygons. .y/.x only
            # work on Points, so collapse everything to a representative
            # point first. Points pass through centroid unchanged.
            geometry = geometry.centroid

            valid = geometry.notna() & ~geometry.is_empty
            geometry = geometry[valid]

            if geometry.empty:
                return None

            coords = np.column_stack(
                (
                    geometry.y.to_numpy(dtype=float),
                    geometry.x.to_numpy(dtype=float),
                )
            )

        # Crime CSV
        elif {"lat", "lon"}.issubset(points.columns):

            coords = points[["lat", "lon"]].to_numpy(dtype=float)

        else:

            raise ValueError(
                "Dataset must contain either geometry or lat/lon columns."
            )

    else:

        points = list(points)

        if not points:
            return None

        coords = np.asarray(points, dtype=float)

    return BallTree(
        np.radians(coords),
        metric="haversine"
    )


def _nearest_distance_m(tree, lat: float, lon: float) -> float:
    """Distance in metres to the nearest point in tree. inf if tree is empty."""
    if tree is None:
        return float("inf")
    query = np.radians([[lat, lon]])
    dist_rad, _ = tree.query(query, k=1)
    return float(dist_rad[0][0] * EARTH_RADIUS_M)


def enrich_graph_features(graph: nx.MultiDiGraph) -> nx.MultiDiGraph:
    """Add risk_score, total_weight, and proximity features to each edge."""
    risk_weight = 3.0
    count = 0

    # Loaded once, reused for every edge.
    hospitals = load_hospitals()
    police = load_police()
    signals = load_signals()
    crime = load_crime()

    hospital_tree = _build_tree(hospitals)
    police_tree = _build_tree(police)
    signal_tree = _build_tree(signals)
    crime_tree = _build_tree(crime)

    # Node lat/lon looked up once per node id (via graph.nodes), not per edge query.
    node_coords = {
        n: (d["y"], d["x"])
        for n, d in graph.nodes(data=True)
        if "y" in d and "x" in d
    }

    for u, v, key, data in graph.edges(keys=True, data=True):
        highway = str(
            data.get(
                "highway",
                "unclassified"
            )
        )
        if isinstance(highway, list):
            highway = highway[0]

        length = max(
            1,
            float(
                data.get(
                    "length",
                    100
                )
                or 100)
        )
        base_risk = _street_light_score(str(highway))

        length_factor = min(
            0.20,
            length / 5000
        )
        risk_score = max(
            0.05,
            min(
                1.0,
                round(
                    base_risk + length_factor,
                    4
                )
            )
        )

        data["risk_score"] = float(risk_score)
        data["risk"] = float(risk_score)
        data["total_weight"] = round(
            length *
            (
                1 +
                risk_score * risk_weight
            ),
            2
        )

        # Edge midpoint (average of u, v node coords) used as the
        # representative point for proximity queries — one query per
        # POI type per edge, O(log n) each via the BallTree.
        u_coord = node_coords.get(u)
        v_coord = node_coords.get(v)
        if u_coord and v_coord:
            mid_lat = (u_coord[0] + v_coord[0]) / 2
            mid_lon = (u_coord[1] + v_coord[1]) / 2

            data["hospital_dist_m"] = round(
                _nearest_distance_m(hospital_tree, mid_lat, mid_lon), 2
            )
            data["police_dist_m"] = round(
                _nearest_distance_m(police_tree, mid_lat, mid_lon), 2
            )
            data["signal_dist_m"] = round(
                _nearest_distance_m(signal_tree, mid_lat, mid_lon), 2
            )
            data["crime_dist_m"] = round(
                _nearest_distance_m(crime_tree, mid_lat, mid_lon), 2
            )

        count += 1
        if count % 5000 == 0:
            logger.info(
                f"{count} roads processed"
            )

    logger.info(
        "Feature enrichment complete."
    )

    return graph


def save_enriched_graph(graph: nx.MultiDiGraph, path: str = GRAPH_PATH) -> str:
    ox.save_graphml(graph, path)
    return path


# NOTE (future work, not yet implemented):
# Extend risk scoring beyond road type alone with additional signals:
#   Hospital Distance + Police Distance + Street Lights +
#   Crowd Density + Crime Score + Road Width -> Risk Score