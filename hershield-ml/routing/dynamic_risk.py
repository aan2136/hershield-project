"""
Dynamic risk adjustment based on weather and time of day.
"""

import logging
from datetime import datetime

logger = logging.getLogger(__name__)

WEATHER_MULTIPLIERS: dict[str, float] = {
    "clear": 1.0,
    "clouds": 1.05,
    "cloudy": 1.05,
    "mist": 1.15,
    "fog": 1.25,
    "haze": 1.15,
    "rain": 1.3,
    "drizzle": 1.2,
    "thunderstorm": 1.5,
    "storm": 1.5,
    "snow": 1.35,
    "smoke": 1.15,
    "dust": 1.15,
    "sand": 1.20,
    "ash": 1.20,
    "squall": 1.45,
    "tornado": 2.0,
}


def _weather_multiplier(weather: str) -> float:
    key = weather.strip().lower().replace("_", " ")
    if key in WEATHER_MULTIPLIERS:
        return WEATHER_MULTIPLIERS[key]

    for condition, multiplier in WEATHER_MULTIPLIERS.items():
        if condition in key:
            return multiplier

    logger.warning(
        f"Unknown weather: {weather}"
    )

    return 1.0


def _is_night(hour: int | None = None) -> bool:
    h = hour if hour is not None else datetime.now().hour
    return h < 5 or h >= 21


def adjust_risk(
    base_risk: float,
    weather: str = "Clear",
    hour: int | None = None,
) -> dict[str, float]:
    """
    Adjust base route risk using weather and time-of-day factors.

    Returns adjusted risk_score and safe_probability (0-100).
    """
    logger.info(
        f"Weather={weather}, Hour={hour}, BaseRisk={base_risk}"
    )

    multiplier = _weather_multiplier(weather)

    if _is_night(hour):
        multiplier *= 1.15

    adjusted = round(
        min(
            1.0,
            max(
                0.0,
                base_risk * multiplier
            )
        ),
        4
    )
    safe_probability = round(max(0.0, (1.0 - adjusted) * 100), 1)

    return {
        "risk_score": adjusted,
        "safe_probability": safe_probability,
    }