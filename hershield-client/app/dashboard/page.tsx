"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Loader2,
  MapPinned,
  Navigation,
  Route,
  ShieldCheck,
  X,
} from "lucide-react";
import dynamic from "next/dynamic";
import {
  detectAnomaly,
  fetchWeather,
  geocodeDestination,
  predictRoute,
  type RoutePrediction,
} from "@/lib/api";
import NavigationMode from "@/components/NavigationMode";
import type { MapHandle } from "@/components/Map";

// Fix: "window is not defined" during SSR/prerendering.
// Map component (Leaflet etc.) touches the browser `window` object at
// module load time, which crashes when Next.js tries to prerender this
// page on the server. Loading it dynamically with ssr:false skips that.
const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[400px] items-center justify-center text-slate-400">
      Loading map...
    </div>
  ),
});

interface JourneyMetrics {
  distance_km: number;
  duration_min: number;
  risk_score: number;
  safe_probability: number;
  recommendation: string;
}

interface PositionSample {
  lat: number;
  lon: number;
  timestamp: number;
  speed: number;
}

export default function JourneyPage() {
  const [source, setSource] = useState<[number, number] | null>(null);
  const [destinationText, setDestinationText] = useState("");
  const [destination, setDestination] = useState<[number, number] | null>(
    null
  );
  const [geometry, setGeometry] = useState<[number, number][]>([]);
  const [metrics, setMetrics] = useState<JourneyMetrics | null>(null);
  const [weather, setWeather] = useState("Clear");
  const [loading, setLoading] = useState(false);
  const [journeyActive, setJourneyActive] = useState(false);
  const [journeyStarted, setJourneyStarted] = useState(false);
  const [navigationMode, setNavigationMode] = useState(false);
  const [error, setError] = useState("");
  const [showEmergency, setShowEmergency] = useState(false);

  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPositionRef = useRef<PositionSample | null>(null);
  const stopStartRef = useRef<number | null>(null);
  const plannedRouteRef = useRef<[number, number][]>([]);
  const mapRef = useRef<MapHandle>(null);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: [number, number] = [
          position.coords.longitude,
          position.coords.latitude,
        ];
        setSource(coords);
        fetchWeather(coords[1], coords[0]).then((w) => {
          if (w.success) setWeather(w.weather);
        });
      },
      () => setError("Please allow location access to use Safe Journey.")
    );
  }, []);

  const handleGenerateRoute = async () => {
    setError("");
    setLoading(true);
    setMetrics(null);
    setGeometry([]);
    setDestination(null);

    try {
      if (!source) {
        throw new Error("Current location not available. Enable GPS.");
      }
      if (!destinationText.trim()) {
        throw new Error("Please enter a destination.");
      }

      const destCoords = await geocodeDestination(destinationText);
      if (!destCoords) {
        throw new Error("Could not find destination. Try lat, lng format.");
      }

      setDestination(destCoords);

      const result: RoutePrediction = await predictRoute(
        source,
        destCoords,
        weather
      );

      if (!result.success) {
        throw new Error(result.message || "Route prediction failed.");
      }

      setGeometry(result.geometry || []);
      plannedRouteRef.current = result.geometry || [];
      setMetrics({
        distance_km: result.distance_km ?? 0,
        duration_min: result.duration_min ?? 0,
        risk_score: result.risk_score ?? 0,
        safe_probability: result.safe_probability ?? 0,
        recommendation: result.recommendation ?? "Safe Route",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate route.");
    } finally {
      setLoading(false);
    }
  };

  const computeGpsDeviation = useCallback(
    (lat: number, lon: number): number => {
      const route = plannedRouteRef.current;
      if (route.length === 0) return 0;

      let minDist = Infinity;
      for (const [rLon, rLat] of route) {
        const dLat = (lat - rLat) * 111320;
        const dLon =
          (lon - rLon) * 111320 * Math.cos((lat * Math.PI) / 180);
        const dist = Math.sqrt(dLat * dLat + dLon * dLon);
        if (dist < minDist) minDist = dist;
      }
      return Math.round(minDist);
    },
    []
  );

  const triggerSOS = useCallback(() => {
    setShowEmergency(true);
    if (navigator.vibrate) navigator.vibrate([500, 200, 500]);
  }, []);

  const sendAnomalyCheck = useCallback(
    async (position: GeolocationPosition) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      const speed = position.coords.speed ?? 0;
      const heading = position.coords.heading ?? 0;
      const now = Date.now();

      const last = lastPositionRef.current;
      let acceleration = 0;
      if (last) {
        const dt = (now - last.timestamp) / 1000;
        if (dt > 0) {
          acceleration = (speed - last.speed) / dt;
        }
      }

      if (speed < 0.3) {
        if (!stopStartRef.current) stopStartRef.current = now;
      } else {
        stopStartRef.current = null;
      }

      const stopDuration = stopStartRef.current
        ? (now - stopStartRef.current) / 1000
        : 0;

      lastPositionRef.current = {
        lat,
        lon,
        timestamp: now,
        speed,
      };

      setSource([lon, lat]);

      // Keep the map centered on the live position while navigating
      mapRef.current?.flyTo([lon, lat], 17);

      const result = await detectAnomaly({
        speed: Math.max(0, speed * 3.6),
        gps_deviation: computeGpsDeviation(lat, lon),
        heading: heading >= 0 ? heading : 0,
        stop_duration: stopDuration,
        acceleration,
      });

      if (result.success && result.anomaly) {
        triggerSOS();
      }
    },
    [computeGpsDeviation, triggerSOS]
  );

  const stopJourney = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setJourneyActive(false);
    setJourneyStarted(false);
    setNavigationMode(false);
  }, []);

  const handleStartJourney = () => {
    if (!metrics || geometry.length === 0) {
      setError("Generate a safe route before starting journey.");
      return;
    }

    setError("");
    setJourneyActive(true);
    setJourneyStarted(true);
    setNavigationMode(true);
    lastPositionRef.current = null;
    stopStartRef.current = null;

    // Start live GPS tracking
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => sendAnomalyCheck(position),
      () => setError("GPS tracking lost."),
      { enableHighAccuracy: true, maximumAge: 3000 }
    );

    intervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (position) => sendAnomalyCheck(position),
        () => {}
      );
    }, 5000);

    // Center the map on the source and zoom in for navigation
    if (source) {
      mapRef.current?.flyTo(source, 17);
    }
  };

  useEffect(() => {
    return () => stopJourney();
  }, [stopJourney]);

  if (navigationMode) {
    return (
      <NavigationMode
        source={source}
        destination={destination}
        geometry={geometry}
        metrics={metrics}
        weather={weather}
        journeyStarted={journeyStarted}
        showEmergency={showEmergency}
        onAcknowledgeEmergency={() => setShowEmergency(false)}
        onStop={stopJourney}
        mapRef={mapRef}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#07111F] text-white">
      <div className="border-b border-slate-800 bg-slate-900 px-8 py-6">
        <h1 className="text-3xl font-bold">Safe Journey</h1>
        <p className="mt-2 text-slate-400">
          AI Powered Safe Route Recommendation
          {weather && (
            <span className="ml-2 text-cyan-400">· Weather: {weather}</span>
          )}
        </p>
      </div>

      <div className="mx-auto mt-10 max-w-5xl px-6">
        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-red-300">
            {error}
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="rounded-3xl bg-slate-900 p-8">
            <h2 className="mb-8 text-2xl font-bold">Journey Details</h2>

            <div className="relative mb-6">
              <MapPinned className="absolute left-4 top-4 text-cyan-400" />
              <input
                readOnly
                value={
                  source
                    ? `${source[1].toFixed(5)}, ${source[0].toFixed(5)}`
                    : "Detecting location..."
                }
                placeholder="Current Location (auto-detected)"
                className="h-14 w-full rounded-xl border border-slate-700 bg-slate-800 pl-12 text-slate-300 outline-none"
              />
            </div>

            <div className="relative">
              <Navigation className="absolute left-4 top-4 text-cyan-400" />
              <input
                value={destinationText}
                onChange={(e) => setDestinationText(e.target.value)}
                placeholder="Destination (e.g. Sector 18 Noida)"
                className="h-14 w-full rounded-xl border border-slate-700 bg-slate-800 pl-12 outline-none focus:border-cyan-500"
                disabled={journeyActive}
              />
            </div>

            <button
              onClick={handleGenerateRoute}
              disabled={loading || journeyActive}
              className="mt-8 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 text-lg font-semibold hover:bg-cyan-600 disabled:opacity-50"
            >
              {loading && <Loader2 className="animate-spin" size={20} />}
              Generate Safe Route
            </button>
          </div>

          <div className="rounded-3xl bg-slate-900 p-8">
            <h2 className="mb-8 text-2xl font-bold">AI Route Summary</h2>

            <div className="space-y-6">
              <div className="rounded-xl bg-slate-800 p-5">
                <Route className="mb-3 text-cyan-400" />
                <h3 className="font-semibold">Distance</h3>
                <p className="text-slate-400">
                  {metrics ? `${metrics.distance_km} km` : "—"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-800 p-5">
                <Navigation className="mb-3 text-cyan-400" />
                <h3 className="font-semibold">Estimated Time</h3>
                <p className="text-slate-400">
                  {metrics ? `${metrics.duration_min} Minutes` : "—"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-800 p-5">
                <ShieldCheck className="mb-3 text-green-400" />
                <h3 className="font-semibold">Safety Score</h3>
                <p className="text-green-400 text-xl">
                  {metrics ? `${metrics.safe_probability}%` : "—"}
                </p>
                {metrics && (
                  <p className="mt-1 text-sm text-slate-500">
                    Risk: {(metrics.risk_score * 100).toFixed(1)}% ·{" "}
                    {metrics.recommendation}
                  </p>
                )}
              </div>
            </div>

            {journeyActive ? (
              <button
                onClick={stopJourney}
                className="mt-8 h-14 w-full rounded-xl bg-red-500 text-lg font-semibold hover:bg-red-600"
              >
                Stop Journey
              </button>
            ) : (
              <button
                onClick={handleStartJourney}
                disabled={!metrics}
                className="mt-8 h-14 w-full rounded-xl bg-green-500 text-lg font-semibold hover:bg-green-600 disabled:opacity-50"
              >
                Start Journey
              </button>
            )}
          </div>
        </div>

        <div className="mt-10 rounded-3xl bg-slate-900 p-6">
          <h2 className="mb-5 text-2xl font-bold">Live Map</h2>
          <Map
            ref={mapRef}
            source={source}
            destination={destination}
            geometry={geometry}
          />
        </div>
      </div>

      {showEmergency && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-3xl border border-red-500/40 bg-slate-900 p-8 text-center">
            <AlertTriangle
              className="mx-auto mb-4 text-red-500"
              size={56}
            />
            <h2 className="text-2xl font-bold text-red-400">
              Emergency Alert
            </h2>
            <p className="mt-3 text-slate-300">
              Anomaly detected in your movement pattern. SOS has been
              triggered. Stay safe and contact your emergency contacts.
            </p>
            <button
              onClick={() => setShowEmergency(false)}
              className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-red-500 font-semibold hover:bg-red-600"
            >
              <X size={18} />
              Acknowledge
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

