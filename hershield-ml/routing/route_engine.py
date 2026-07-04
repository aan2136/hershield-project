"""
Route engine: loads noida_risk.graphml and computes shortest safe routes.
"""

import logging
import os
from typing import Any

import networkx as nx
import osmnx as ox

logger = logging.getLogger(__name__)

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GRAPH_PATH = os.path.join(PROJECT_ROOT, "models", "noida_risk.graphml")

AVERAGE_SPEED_KMPH = 5.0

_graph: nx.MultiDiGraph | None = None


def _load_graph() -> nx.MultiDiGraph:
    global _graph
    if _graph is not None:
        return _graph

    if not os.path.exists(GRAPH_PATH):
        raise FileNotFoundError(
            f"Graph not found: {GRAPH_PATH}"
        )

    _graph = ox.load_graphml(GRAPH_PATH)
    logger.info("Noida graph loaded successfully.")

    # GraphML may deserialize numeric attrs as strings — normalize weights
    for _u, _v, _key, data in _graph.edges(keys=True, data=True):
        if "total_weight" in data:
            data["total_weight"] = float(data["total_weight"])
        if "length" in data:
            data["length"] = float(data["length"])
        if "risk_score" in data:
            data["risk_score"] = float(data["risk_score"])

    return _graph


def _nearest_node(graph: nx.MultiDiGraph, lon: float, lat: float) -> int:
    return ox.distance.nearest_nodes(graph, X=lon, Y=lat)


def _edge_risk(graph: nx.MultiDiGraph, u: int, v: int) -> float:
    edge_data = graph.get_edge_data(u, v)
    if not edge_data:
        return 0.5
    risks = [
        float(data.get("risk_score", data.get("risk", 0.5)))
        for data in edge_data.values()
    ]
    return float(sum(risks) / len(risks)) if risks else 0.5


def _path_geometry(graph: nx.MultiDiGraph, path: list[int]) -> list[list[float]]:
    geometry: list[list[float]] = []
    for node in path:
        node_data = graph.nodes[node]
        geometry.append([float(node_data["x"]), float(node_data["y"])])
    return geometry


def _path_distance_km(graph: nx.MultiDiGraph, path: list[int]) -> float:
    total_m = 0.0
    for i in range(len(path) - 1):
        u, v = path[i], path[i + 1]
        edge_data = graph.get_edge_data(u, v)
        if edge_data:
            lengths = [float(data.get("length", 0)) for data in edge_data.values()]
            total_m += min(lengths) if lengths else 0
    return round(total_m / 1000, 2)


def _path_risk_score(graph: nx.MultiDiGraph, path: list[int]) -> float:
    if len(path) < 2:
        return 0.5
    risks = [_edge_risk(graph, path[i], path[i + 1]) for i in range(len(path) - 1)]
    return round(float(sum(risks) / len(risks)), 4)


def _recommendation(risk_score: float) -> str:
    if risk_score <= 0.35:
        return "Safe Route"
    if risk_score <= 0.55:
        return "Moderate Risk - Stay Alert"
    if risk_score <= 0.75:
        return "High Risk - Consider Alternate Route"
    return "Very High Risk - Avoid This Route"


def shortest_route(
    source: list[float],
    destination: list[float],
) -> dict[str, Any]:
    """
    Find shortest path using total_weight on the Noida risk graph.

    Args:
        source: [longitude, latitude]
        destination: [longitude, latitude]

    Returns:
        dict with distance_km, duration_min, geometry, risk_score, recommendation
    """
    graph = _load_graph()

    src_lon, src_lat = float(source[0]), float(source[1])
    dst_lon, dst_lat = float(destination[0]), float(destination[1])

    src_node = _nearest_node(graph, src_lon, src_lat)
    dst_node = _nearest_node(graph, dst_lon, dst_lat)

    if src_node == dst_node:
        return {
            "distance_km": 0.0,
            "duration_min": 0,
            "geometry": [[src_lon, src_lat]],
            "risk_score": 0.0,
            "recommendation": "Safe Route",
            "source_node": src_node,
            "destination_node": dst_node,
            "path_nodes": 1,
        }

    try:
        path = nx.shortest_path(
            graph,
            src_node,
            dst_node,
            weight="total_weight"
        )
    except nx.NetworkXNoPath:
        raise ValueError(
            "No safe route found."
        )

    distance_km = _path_distance_km(graph, path)
    risk_score = _path_risk_score(graph, path)
    geometry = _path_geometry(graph, path)

    # Average walking speed ~5 km/h
    duration_min = max(
        1,
        round(
            (distance_km / AVERAGE_SPEED_KMPH) * 60
        )
    )

    return {
        "distance_km": distance_km,
        "duration_min": duration_min,
        "geometry": geometry,
        "risk_score": risk_score,
        "recommendation": _recommendation(risk_score),
        "source_node": src_node,
        "destination_node": dst_node,
        "path_nodes": len(path),
    }