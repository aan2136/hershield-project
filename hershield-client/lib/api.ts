const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export interface RoutePrediction {
  success: boolean;
  distance_km?: number;
  duration_min?: number;
  geometry?: [number, number][];
  risk_score?: number;
  safe_probability?: number;
  recommendation?: string;
  message?: string;
}

export interface AnomalyResult {
  success: boolean;
  anomaly?: boolean;
  anomaly_score?: number;
  message?: string;
}

export interface WeatherResult {
  success: boolean;
  weather: string;
  description?: string;
  temperature?: number | null;
}

export async function predictRoute(
  source: [number, number],
  destination: [number, number],
  weather: string
): Promise<RoutePrediction> {
  const res = await fetch(`${API_URL}/api/routes/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source, destination, weather }),
  });
  return res.json();
}

export async function detectAnomaly(payload: {
  speed: number;
  gps_deviation: number;
  heading: number;
  stop_duration: number;
  acceleration: number;
}): Promise<AnomalyResult> {
  const res = await fetch(`${API_URL}/api/routes/anomaly`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function fetchWeather(
  lat: number,
  lon: number
): Promise<WeatherResult> {
  const res = await fetch(
    `${API_URL}/api/routes/weather?lat=${lat}&lon=${lon}`
  );
  return res.json();
}

export async function geocodeDestination(
  query: string
): Promise<[number, number] | null> {
  const trimmed = query.trim();
  const coordMatch = trimmed.match(
    /^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/
  );
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]);
    const lon = parseFloat(coordMatch[2]);
    if (!isNaN(lat) && !isNaN(lon)) {
      return [lon, lat];
    }
  }

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(trimmed + ", Noida, India")}&limit=1`,
    { headers: { "User-Agent": "HerShield/1.0" } }
  );
  const data = await res.json();
  if (data.length === 0) return null;
  return [parseFloat(data[0].lon), parseFloat(data[0].lat)];
}
