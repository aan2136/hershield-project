"""
app.py

HerShield ML service entrypoint. Registers all API blueprints, including
the real scream-detection endpoint (api/scream_detector.py).
"""

from __future__ import annotations

from flask import Flask
from flask_cors import CORS

from api.routes import routes_bp
from api.scream_detector import scream_detector_bp

app = Flask(__name__)
CORS(app)

# Existing API routes (unchanged).
app.register_blueprint(routes_bp)

# Real scream-detection endpoint: POST /detect-scream
app.register_blueprint(scream_detector_bp)


@app.route("/health", methods=["GET"])
def health():
    return {"status": "ok"}, 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
