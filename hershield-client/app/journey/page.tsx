"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Bike,
  Car,
  Loader2,
  MapPinned,
  Navigation,
  PersonStanding,
  Route,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  detectAnomaly,
  fetchWeather,
  geocodeDestination,
  predictRoute,
  type RoutePrediction,
} from "@/lib/api";
import NavigationMode from "@/components/NavigationMode";
import dynamic from "next/dynamic";
import type { MapHandle } from "@/components/Map";

const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
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

type VehicleType = "car" | "bike" | "walk";

// Common Indian registration format, e.g. UP16AB1234, DL-3C-AB-1234, MH12AB1234.
// Kept intentionally loose — used only to hint at a probable typo, never to block.
const VEHICLE_NUMBER_PATTERN =
  /^[A-Za-z]{2}[\s-]?[0-9]{1,2}[\s-]?[A-Za-z]{1,3}[\s-]?[0-9]{4}$/;

export default function JourneyPage() {
  const [source, setSource] = useState<[number, number] | null>(null);
  const [destinationText, setDestinationText] = useState("");
  const [destination, setDestination] = useState<[number, number] | null>(
    null
  );
  const [vehicle, setVehicle] = useState<VehicleType>("car");
  const [vehicleNumber, setVehicleNumber] = useState("");
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

  const requiresVehicleNumber = vehicle === "car" || vehicle === "bike";
  const vehicleNumberLooksValid =
    !vehicleNumber.trim() || VEHICLE_NUMBER_PATTERN.test(vehicleNumber.trim());

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

    if (!source) {
      setError("Current location not available. Enable GPS.");
      return;
    }
    if (!destinationText.trim()) {
      setError("Please enter a destination.");
      return;
    }
    if (requiresVehicleNumber && !vehicleNumber.trim()) {
      setError(
        `Vehicle number is required for ${vehicle === "car" ? "Car" : "Bike"}.`
      );
      return;
    }

    setLoading(true);
    setMetrics(null);
    setGeometry([]);
    setDestination(null);

    try {
      const destCoords = await geocodeDestination(destinationText);
      if (!destCoords) {
        throw new Error("Could not find destination. Try lat, lng format.");
      }

      setDestination(destCoords);

      // NOTE: vehicle + vehicleNumber are intentionally NOT sent to the
      // backend — predictRoute's signature is unchanged. They are kept
      // in frontend state only, for display/preservation purposes.
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
        console.log("SOS triggered from ANOMALY", result);
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
    // destinationText, vehicle, and vehicleNumber are intentionally left
    // untouched here so Step 4 (END JOURNEY) preserves them.
  }, []);

  const handleStartJourney = async () => {
    if (!metrics || geometry.length === 0) {
      setError("Generate a safe route before starting journey.");
      return;
    }

    setError("");

    // Immediately request Location + Microphone permissions.
    navigator.geolocation.getCurrentPosition(
      () => {},
      () => {}
    );

    try {
      const tempStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      tempStream.getTracks().forEach((track) => track.stop());
    } catch {
      setError(
        "Microphone permission is required for continuous safety monitoring."
      );
      return;
    }

    localStorage.setItem("vehicleNumber", vehicleNumber);

    localStorage.setItem("vehicleType", vehicle);

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

  // STEP 3 / STEP 4: while navigation is active, render ONLY NavigationMode,
  // fullscreen, with the Journey Planner fully hidden. Ending the journey
  // (via NavigationMode's end control) tears down tracking and returns to
  // the Journey Planner with destination, vehicle type, and vehicle number
  // preserved (see stopJourney above).
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
        onScreamDetected={triggerSOS}
      />
    );
  }

  const vehicleOptions: { id: VehicleType; label: string; icon: typeof Car }[] = [
    { id: "car", label: "Car", icon: Car },
    { id: "bike", label: "Bike", icon: Bike },
    { id: "walk", label: "Walk", icon: PersonStanding },
  ];

  return (
    <div className="min-h-screen bg-[#07111F] text-white">
      <div className="border-b border-slate-800 bg-slate-900 px-5 py-5 sm:px-8 sm:py-6">
        <h1 className="text-2xl font-bold sm:text-3xl">Safe Journey</h1>
        <p className="mt-2 text-sm text-slate-400 sm:text-base">
          AI Powered Safe Route Recommendation
          {weather && (
            <span className="ml-2 text-cyan-400">· Weather: {weather}</span>
          )}
        </p>
      </div>

      <div className="mx-auto mt-6 max-w-5xl px-4 pb-10 sm:mt-10 sm:px-6">
        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-red-300">
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
          {/* STEP 1: Journey Planner */}
          <div className="rounded-3xl bg-slate-900 p-5 shadow-lg shadow-black/20 sm:p-8">
            <h2 className="mb-6 text-xl font-bold sm:mb-8 sm:text-2xl">
              Journey Details
            </h2>

            <div className="relative mb-5">
              <MapPinned className="absolute left-4 top-4 text-cyan-400" />
              <input
                readOnly
                value={
                  source
                    ? `${source[1].toFixed(5)}, ${source[0].toFixed(5)}`
                    : "Detecting location..."
                }
                placeholder="Current Location (auto-detected)"
                className="h-14 w-full rounded-2xl border border-slate-700 bg-slate-800 pl-12 text-base text-slate-300 outline-none"
              />
            </div>

            <div className="relative mb-6">
              <Navigation className="absolute left-4 top-4 text-cyan-400" />
              <input
                value={destinationText}
                onChange={(e) => setDestinationText(e.target.value)}
                placeholder="Destination (e.g. Sector 18 Noida)"
                className="h-14 w-full rounded-2xl border border-slate-700 bg-slate-800 pl-12 text-base outline-none focus:border-cyan-500"
                disabled={journeyActive}
              />
            </div>

            <div>
              <p className="mb-3 text-sm font-semibold text-slate-400">
                Vehicle Type
              </p>
              <div className="grid grid-cols-3 gap-3">
                {vehicleOptions.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setVehicle(id)}
                    disabled={journeyActive}
                    aria-pressed={vehicle === id}
                    className={`flex h-20 flex-col items-center justify-center gap-1 rounded-2xl border text-sm font-medium transition active:scale-95 disabled:opacity-50 ${
                      vehicle === id
                        ? "border-cyan-500 bg-cyan-500/10 text-cyan-300"
                        : "border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-500"
                    }`}
                  >
                    <Icon size={22} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {requiresVehicleNumber && (
              <div className="mt-6">
                <label
                  htmlFor="vehicleNumber"
                  className="mb-2 block text-sm font-semibold text-slate-400"
                >
                  Vehicle Number{" "}
                  <span className="text-red-400">*</span>
                </label>
                <input
                  id="vehicleNumber"
                  value={vehicleNumber}
                  onChange={(e) =>
                    setVehicleNumber(e.target.value.toUpperCase())
                  }
                  placeholder="e.g. UP16AB1234"
                  disabled={journeyActive}
                  className={`h-14 w-full rounded-2xl border bg-slate-800 px-4 text-base uppercase tracking-wide outline-none disabled:opacity-50 ${
                    vehicleNumberLooksValid
                      ? "border-slate-700 focus:border-cyan-500"
                      : "border-amber-500/60 focus:border-amber-500"
                  }`}
                />
                {!vehicleNumberLooksValid && (
                  <p className="mt-2 text-xs text-amber-400">
                    That doesn't look like a typical registration number
                    (e.g. UP16AB1234) — double-check it, but you can still
                    continue.
                  </p>
                )}
              </div>
            )}

            <button
              onClick={handleGenerateRoute}
              disabled={loading || journeyActive}
              className="mt-8 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-cyan-500 text-lg font-semibold transition hover:bg-cyan-600 active:scale-[0.99] disabled:opacity-50"
            >
              {loading && <Loader2 className="animate-spin" size={20} />}
              Generate Safe Route
            </button>
          </div>

          {/* STEP 2: AI Route Summary */}
          <div className="rounded-3xl bg-slate-900 p-5 shadow-lg shadow-black/20 sm:p-8">
            <h2 className="mb-6 text-xl font-bold sm:mb-8 sm:text-2xl">
              AI Route Summary
            </h2>

            <div className="space-y-4 sm:space-y-6">
              <div className="rounded-2xl bg-slate-800 p-5">
                <Route className="mb-3 text-cyan-400" />
                <h3 className="font-semibold">Distance</h3>
                <p className="text-slate-400">
                  {metrics ? `${metrics.distance_km} km` : "—"}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-800 p-5">
                <Navigation className="mb-3 text-cyan-400" />
                <h3 className="font-semibold">Estimated Time</h3>
                <p className="text-slate-400">
                  {metrics ? `${metrics.duration_min} Minutes` : "—"}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-800 p-5">
                <ShieldCheck className="mb-3 text-green-400" />
                <h3 className="font-semibold">Safety Score</h3>
                <p className="text-xl text-green-400">
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
                className="mt-8 h-14 w-full rounded-2xl bg-red-500 text-lg font-semibold transition hover:bg-red-600 active:scale-[0.99]"
              >
                Stop Journey
              </button>
            ) : (
              <button
                onClick={handleStartJourney}
                disabled={!metrics}
                className="mt-8 h-14 w-full rounded-2xl bg-green-500 text-lg font-semibold transition hover:bg-green-600 active:scale-[0.99] disabled:opacity-50"
              >
                Start Journey
              </button>
            )}
          </div>
        </div>

        {/* Preview Map (Step 2) — only shown before navigation starts */}
        <div className="mt-6 rounded-3xl bg-slate-900 p-4 shadow-lg shadow-black/20 sm:mt-10 sm:p-6">
          <h2 className="mb-4 text-xl font-bold sm:mb-5 sm:text-2xl">
            Preview Map
          </h2>
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
              className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-red-500 font-semibold transition hover:bg-red-600 active:scale-[0.99]"
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
