// components/DirectionBanner.tsx
'use client';

import React from 'react';
import {
  ArrowUp,
  ArrowRight,
  ArrowLeft,
  CornerUpRight,
  CornerUpLeft,
  RotateCcw,
  MapPin,
  HelpCircle,
} from 'lucide-react';

export type Maneuver =
  | 'straight'
  | 'left'
  | 'right'
  | 'slight-left'
  | 'slight-right'
  | 'sharp-left'
  | 'sharp-right'
  | 'u-turn'
  | 'arrive'
  | null;

interface DirectionBannerProps {
  instruction: string | null;
  distanceToNextTurn: string | null;
  maneuver?: Maneuver;
  visible?: boolean;
}

function getManeuverIcon(maneuver?: Maneuver) {
  const iconProps = { size: 30, strokeWidth: 2.5, className: 'text-white' };
  switch (maneuver) {
    case 'straight':
      return <ArrowUp {...iconProps} />;
    case 'right':
    case 'sharp-right':
      return <CornerUpRight {...iconProps} />;
    case 'left':
    case 'sharp-left':
      return <CornerUpLeft {...iconProps} />;
    case 'slight-right':
      return <ArrowRight {...iconProps} />;
    case 'slight-left':
      return <ArrowLeft {...iconProps} />;
    case 'u-turn':
      return <RotateCcw {...iconProps} />;
    case 'arrive':
      return <MapPin {...iconProps} />;
    default:
      return <HelpCircle {...iconProps} />;
  }
}

const DirectionBanner: React.FC<DirectionBannerProps> = ({
  instruction,
  distanceToNextTurn,
  maneuver = null,
  visible = true,
}) => {
  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[1200] px-3 pt-[max(0.75rem,env(safe-area-inset-top))] transition-all duration-300 ease-out ${
        visible
          ? 'opacity-100 translate-y-0'
          : '-translate-y-full opacity-0 pointer-events-none'
      }`}
    >
      <div className="mx-auto max-w-xl rounded-2xl bg-[#141a24]/95 backdrop-blur-md border border-white/10 shadow-2xl shadow-black/50 px-4 py-3 flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 border border-cyan-400/30">
          {getManeuverIcon(maneuver)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold text-white leading-tight">
          {instruction || "Continue Straight"}
          </p>
          <p className="text-sm text-cyan-300/80 font-medium mt-0.5">
            {distanceToNextTurn ? `After ${distanceToNextTurn}` : "Follow the route"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default DirectionBanner;