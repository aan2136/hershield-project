"""
Build the Noida road network graph with risk weights.
Run once: python graph_risk_builder.py
"""

import logging
import os

import osmnx as ox

from routing.feature_enrichment import (
    enrich_graph_features,
    save_enriched_graph,
)

logger = logging.getLogger(__name__)

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

GRAPH_PATH = os.path.join(
    PROJECT_ROOT,
    "models",
    "noida_risk.graphml"
)

# Noida, Uttar Pradesh, India
NOIDA_PLACE = "Noida, Uttar Pradesh, India"


def build_graph() -> None:
    os.makedirs(
        os.path.dirname(GRAPH_PATH),
        exist_ok=True
    )

    try:
        ox.settings.use_cache = True
        ox.settings.log_console = True

        logger.info(f"Downloading road network for {NOIDA_PLACE}...")
        graph = ox.graph_from_place(
            NOIDA_PLACE,
            network_type="walk",
            simplify=True,
        )

        logger.info("Enriching graph with risk features...")
        graph = enrich_graph_features(graph)

        save_enriched_graph(graph, GRAPH_PATH)
        logger.info(f"Graph saved to {GRAPH_PATH}")
        logger.info(
            "Graph built successfully | Nodes=%s | Edges=%s",
            graph.number_of_nodes(),
            graph.number_of_edges(),
        )
    except Exception as e:
        logger.exception(e)
        raise


if __name__ == "__main__":
    build_graph()