// components/BottomSheet.tsx
'use client';

import React, { useCallback, useRef, useState } from 'react';
import { Clock, Route, CloudSun, ShieldCheck, Sparkles } from 'lucide-react';

interface BottomSheetProps {
  distance: string | null;
  eta: string | null;
  weather: string | null;
  safetyScore: string | null;
  recommendation: string | null;
  onEndJourney: () => void;
  expanded?: boolean;
  onToggleExpand?: (expanded: boolean) => void;
}

const COLLAPSED_HEIGHT = 170;
const EXPANDED_HEIGHT_RATIO = 0.45;

const BottomSheet: React.FC<BottomSheetProps> = ({
  distance,
  eta,
  weather,
  safetyScore,
  recommendation,
  onEndJourney,
  expanded: expandedProp,
  onToggleExpand,
}) => {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const isControlled = expandedProp !== undefined;
  const expanded = isControlled ? expandedProp! : internalExpanded;

  const dragStartY = useRef<number | null>(null);
  const dragging = useRef(false);

  const setExpanded = useCallback(
    (value: boolean) => {
      if (!isControlled) setInternalExpanded(value);
      onToggleExpand?.(value);
    },
    [isControlled, onToggleExpand]
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    dragStartY.current = e.clientY;
    dragging.current = true;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragging.current || dragStartY.current === null) return;
    const delta = e.clientY - dragStartY.current;
    if (delta < -30) setExpanded(true);
    else if (delta > 30) setExpanded(false);
    dragging.current = false;
    dragStartY.current = null;
  };

  const sheetHeight = expanded
    ? `${EXPANDED_HEIGHT_RATIO * 100}vh`
    : `${COLLAPSED_HEIGHT}px`;

  return (
    <div
      className="fixed left-0 right-0 bottom-0 z-[1100] rounded-t-3xl bg-[#0f141c]/97 backdrop-blur-md border-t border-white/10 shadow-[0_-8px_30px_rgba(0,0,0,0.55)] transition-[height] duration-300 ease-out flex flex-col overflow-hidden"
      style={{ height: sheetHeight }}
    >
      <div
        className="w-full flex justify-center pt-2.5 pb-1.5 cursor-grab active:cursor-grabbing touch-none"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="h-1.5 w-10 rounded-full bg-white/25" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="grid grid-cols-2 gap-3 mt-1">
          <StatCard
            icon={<Route size={18} className="text-cyan-400" />}
            label="Distance"
            value={distance ?? '--'}
          />
          <StatCard
            icon={<Clock size={18} className="text-cyan-400" />}
            label="ETA"
            value={eta ?? '--'}
          />
          <StatCard
            icon={<CloudSun size={18} className="text-cyan-400" />}
            label="Weather"
            value={weather ?? '--'}
          />
          <StatCard
            icon={<ShieldCheck size={18} className="text-cyan-400" />}
            label="Safety"
            value={safetyScore ? `${safetyScore}%` : '--'}
          />
        </div>

        {expanded && (
          <div className="mt-4 rounded-2xl bg-white/5 border border-white/10 p-4 flex gap-3 items-start animate-[fadeIn_0.25s_ease-out]">
            <Sparkles size={20} className="text-cyan-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-white/50 font-medium mb-1">
                Recommendation
              </p>
              <p className="text-sm text-white/90 leading-relaxed">
                {recommendation ?? '--'}
              </p>
            </div>
          </div>
        )}

        <button
          onClick={onEndJourney}
          className="mt-4 w-full rounded-2xl bg-red-500 hover:bg-red-600 active:scale-[0.98] transition-all duration-150 py-4 text-white text-base font-semibold shadow-lg shadow-red-500/25"
        >
          End Journey
        </button>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
}> = ({ icon, label, value }) => (
  <div className="rounded-2xl bg-white/5 border border-white/10 px-3.5 py-3 flex flex-col gap-1.5">
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-xs text-white/50 font-medium">{label}</span>
    </div>
    <span className="text-lg font-semibold text-white truncate">{value}</span>
  </div>
);

export default BottomSheet;