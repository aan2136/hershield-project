// components/NavigationMode.tsx
'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import type { MapHandle } from './Map';
import DirectionBanner from './DirectionBanner';
import BottomSheet from './BottomSheet';
import FloatingControls from './FloatingControls';
import EmergencyVerificationModal from './EmergencyVerificationModal';

import AudioMonitor from "@/components/AudioMonitor";

// Fix: Leaflet touches `window` at module-evaluation time. A static
// `import Map from './Map'` gets bundled into the server chunk during
// prerendering and crashes with "window is not defined". Loading it
// dynamically with ssr:false keeps it out of the server bundle.
const Map = dynamic(() => import('./Map'), { ssr: false });

interface JourneyMetrics {
  distance_km: number;
  duration_min: number;
  risk_score: number;
  safe_probability: number;
  recommendation: string;
}

interface NavigationModeProps {
  source: [number, number] | null;
  destination: [number, number] | null;
  geometry: [number, number][];
  metrics: JourneyMetrics | null;
  weather: string;
  journeyStarted: boolean;
  showEmergency: boolean;
  onAcknowledgeEmergency: () => void;
  onStop: () => void;
  mapRef: React.RefObject<MapHandle | null>;
  onScreamDetected: () => void;
}

const FALLBACK_INSTRUCTION = 'Follow the highlighted safe route';

const STARTUP_GRACE_PERIOD_MS = 10000;

const NavigationMode: React.FC<NavigationModeProps> = ({
  source,
  destination,
  geometry,
  metrics,
  weather,
  journeyStarted,
  showEmergency,
  onAcknowledgeEmergency,
  onStop,
  mapRef,
  onScreamDetected,
}) => {
  const [sheetExpanded, setSheetExpanded] = React.useState(false);
  const mountedAt = React.useRef(Date.now());

  React.useEffect(() => {
    console.log("NavigationMode mounted");
  }, []);

  const handleVerifiedEmergency = () => {
    const elapsed = Date.now() - mountedAt.current;
    if (elapsed < STARTUP_GRACE_PERIOD_MS) {
      console.log("Ignoring startup trigger");
      return;
    }
    console.log("Emergency accepted after startup");
    onScreamDetected();
  };

  const handleRecenter = () => {
    mapRef.current?.recenter();
  };

  const handleCompassClick = () => {
    if (source) {
      mapRef.current?.flyTo(source, 17);
    }
  };

  const distanceLabel =
    metrics != null ? `${metrics.distance_km} km` : null;
  const etaLabel = metrics != null ? `${metrics.duration_min} min` : null;
  const safetyScoreLabel =
    metrics != null ? `${metrics.safe_probability}%` : null;
  const recommendationLabel = metrics?.recommendation ?? null;

  return (
    <div className="fixed inset-0 w-full h-full bg-[#0a0e14] overflow-hidden">
      <div
        className={
          showEmergency
            ? 'absolute inset-0 h-full w-full transition-all duration-300 blur-md scale-105 brightness-75'
            : 'absolute inset-0 h-full w-full transition-all duration-300'
        }
      >
        <Map ref={mapRef} source={source} destination={destination} geometry={geometry} fullscreen />

        <DirectionBanner
          instruction={FALLBACK_INSTRUCTION}
          distanceToNextTurn={null}
          maneuver={null}
          visible={true}
        />

        {!journeyStarted && (
          <div className="absolute left-1/2 top-20 z-20 -translate-x-1/2 rounded-full bg-black/60 px-4 py-2 text-xs font-medium text-slate-200 backdrop-blur">
            Acquiring GPS signal…
          </div>
        )}

        <FloatingControls
          heading={null}
          onCompassClick={handleCompassClick}
          onRecenter={handleRecenter}
          bottomOffset={sheetExpanded ? 420 : 148}
        />

        <BottomSheet
          distance={distanceLabel}
          eta={etaLabel}
          weather={weather}
          safetyScore={safetyScoreLabel}
          recommendation={recommendationLabel}
          onEndJourney={onStop}
          expanded={sheetExpanded}
          onToggleExpand={setSheetExpanded}
        />

        <AudioMonitor onScreamDetected={handleVerifiedEmergency} />
      </div>
  
      {showEmergency && (
        <EmergencyVerificationModal
          onSafe={onAcknowledgeEmergency}
          onSOS={onStop}
        />
      )}
    </div>
  );
};

export default NavigationMode;

