// components/FloatingControls.tsx
'use client';

import React from 'react';
import { Compass, LocateFixed, Mic, MicOff, Siren } from 'lucide-react';

interface FloatingControlsProps {
  heading?: number | null;
  onCompassClick?: () => void;
  onRecenter?: () => void;
  voiceEnabled?: boolean;
  onVoiceToggle?: () => void;
  onSOS?: () => void;
  bottomOffset?: number;
}

const FloatingControls: React.FC<FloatingControlsProps> = ({
  heading = null,
  onCompassClick,
  onRecenter,
  voiceEnabled = false,
  onVoiceToggle,
  onSOS,
 bottomOffset = 190,
}) => {
  return (
    <>
      <div
        className="fixed right-3 z-[1150] flex flex-col gap-3 transition-[bottom] duration-300 ease-out"
        style={{ bottom: bottomOffset }}
      >
        <ControlButton
          label="Compass"
          onClick={onCompassClick}
          className="text-white"
        >
          <Compass
            size={22}
            style={{
              transform: `rotate(${typeof heading === 'number' ? -heading : 0}deg)`,
              transition: 'transform 0.3s ease',
            }}
          />
        </ControlButton>

        <ControlButton label="Recenter" onClick={onRecenter} className="text-white">
          <LocateFixed size={22} />
        </ControlButton>

        <ControlButton
          label="Voice"
          onClick={onVoiceToggle}
          className={voiceEnabled ? 'text-cyan-400' : 'text-white'}
        >
          {voiceEnabled ? <Mic size={22} /> : <MicOff size={22} />}
        </ControlButton>
      </div>

      <div
        className="fixed left-3 z-[1150] transition-[bottom] duration-300 ease-out"
        style={{ bottom: bottomOffset }}
      >
        <button
          onClick={onSOS}
          aria-label="SOS"
          className="h-14 w-14 rounded-full bg-red-500 hover:bg-red-600 active:scale-95 flex items-center justify-center shadow-lg shadow-red-500/30 border border-red-400/40 transition-all duration-150"
        >
          <Siren size={24} className="text-white" />
        </button>
      </div>
    </>
  );
};

const ControlButton: React.FC<{
  label: string;
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
}> = ({ label, onClick, className = '', children }) => (
  <button
    onClick={onClick}
    aria-label={label}
    className={`h-12 w-12 rounded-full bg-[#141a24]/95 backdrop-blur-md border border-white/10 flex items-center justify-center shadow-lg shadow-black/40 active:scale-90 transition-all duration-150 hover:bg-[#1c2430] ${className}`}
  >
    {children}
  </button>
);

export default FloatingControls;