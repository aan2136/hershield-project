// components/EmergencyVerificationModal.tsx
'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import AlarmPlayer from './AlarmPlayer';
import VoiceRecognizer from './VoiceRecognizer';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface EmergencyVerificationModalProps {
  onSafe: () => void;
  onSOS: () => void;
}

const COUNTDOWN_START = 30;
const VIBRATION_PATTERN: number[] = [400, 200, 400, 200];
const VIBRATION_INTERVAL_MS = 1400;

const formatCountdown = (seconds: number): string => {
  const clamped = Math.max(0, seconds);
  const mm = Math.floor(clamped / 60)
    .toString()
    .padStart(2, '0');
  const ss = (clamped % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
};

const EmergencyVerificationModal: React.FC<EmergencyVerificationModalProps> = ({
  onSafe,
  onSOS,
}) => {
  const [visible, setVisible] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_START);
  const [isListening, setIsListening] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const sosFiredRef = useRef(false);
  const resolvedRef = useRef(false);
  const vibrationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );
  const hintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopAlarm = useCallback(() => {
    AlarmPlayer.getInstance().stop();
  }, []);

  const stopVibration = useCallback(() => {
    if (vibrationIntervalRef.current !== null) {
      clearInterval(vibrationIntervalRef.current);
      vibrationIntervalRef.current = null;
    }
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(0);
    }
  }, []);

  const stopEverything = useCallback(() => {
    stopAlarm();
    stopVibration();
  }, [stopAlarm, stopVibration]);

  // Start alarm + vibration immediately on mount
  useEffect(() => {
    AlarmPlayer.getInstance().play();
    AlarmPlayer.getInstance().setVolume(1);

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(VIBRATION_PATTERN);
      vibrationIntervalRef.current = setInterval(() => {
        navigator.vibrate(VIBRATION_PATTERN);
      }, VIBRATION_INTERVAL_MS);
    }

    return () => {
      stopEverything();
      if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 30 second countdown
  useEffect(() => {
    if (resolvedRef.current) return;

    if (secondsLeft <= 0) {
      if (!sosFiredRef.current) {
        sosFiredRef.current = true;

        const sendSOS = async () => {
          try {
            const position = await new Promise<GeolocationPosition>(
              (resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject);
              }
            );

            try {
              await fetch(`${API_URL}/api/sos`, {
                method: "POST",
                headers: {
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token")}`,
},
                body: JSON.stringify({
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    vehicleNumber: localStorage.getItem("vehicleNumber"),
    reason: "SCREAM DETECTED"
}),
              });
            } catch {
              // ignore fetch failure, still notify
            }
          } catch {
            // ignore GPS failure, still notify
          } finally {
            onSOS();
          }
        };

        sendSOS();
      }
      return;
    }

    const t = setTimeout(() => {
      setSecondsLeft((s) => s - 1);
    }, 1000);

    return () => clearTimeout(t);
  }, [secondsLeft, onSOS]);

  const handleSafe = useCallback(() => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    setIsListening(false);
    stopEverything();
    setVisible(false);
    onSafe();
  }, [onSafe, stopEverything]);

  const handleVoiceFailure = useCallback(() => {
    if (resolvedRef.current) return;
    setHint("Didn't catch that — say \"I am safe\"");
    if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
    hintTimeoutRef.current = setTimeout(() => setHint(null), 2500);
  }, []);

  const handleStartVerification = useCallback(() => {
    if (resolvedRef.current) return;
    setHint(null);
    setIsListening(true);
  }, []);

  if (!visible) return null;

  const isCritical = secondsLeft <= 10;

  return (
    <div className="evm-root" role="alertdialog" aria-live="assertive">
      <div className="evm-glow" aria-hidden="true" />

      <div className="evm-content">
        <div className="evm-icon-ring">
          <span className="evm-icon">⚠</span>
        </div>

        <h1 className="evm-title">EMERGENCY DETECTED</h1>
        <p className="evm-subtitle">ARE YOU SAFE?</p>

        <div className={`evm-countdown ${isCritical ? 'evm-countdown-critical' : ''}`}>
          {formatCountdown(secondsLeft)}
        </div>

        <div className="evm-hint-slot">
          {isListening && (
            <div className="evm-listening">
              <span className="evm-listening-dot" />
              Listening for &quot;I am safe&quot;
            </div>
          )}
          {hint && !isListening && <div className="evm-hint">{hint}</div>}
        </div>

        <button
          type="button"
          className={`evm-button ${isListening ? 'evm-button-active' : ''}`}
          onClick={handleStartVerification}
          disabled={isListening}
        >
          {isListening ? 'VERIFYING…' : 'START VOICE VERIFICATION'}
        </button>

        <p className="evm-footnote">
          Say <strong>&quot;I am safe&quot;</strong> to stop the alarm
        </p>
      </div>

      {isListening && (
        <VoiceRecognizer onSuccess={handleSafe} onFailure={handleVoiceFailure} />
      )}

      <style jsx>{`
        .evm-root {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(
              120% 120% at 50% 0%,
              rgba(127, 5, 15, 0.55) 0%,
              rgba(10, 2, 3, 0.98) 60%
            ),
            #05000a;
          overflow: hidden;
          -webkit-tap-highlight-color: transparent;
        }

        .evm-glow {
          position: absolute;
          inset: -20%;
          background: radial-gradient(
            circle at 50% 30%,
            rgba(220, 38, 38, 0.35),
            transparent 60%
          );
          animation: evm-siren 1.6s ease-in-out infinite;
          pointer-events: none;
        }

        @keyframes evm-siren {
          0%,
          100% {
            opacity: 0.5;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.08);
          }
        }

        .evm-content {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 32px 24px 40px;
          width: 100%;
          max-width: 420px;
        }

        .evm-icon-ring {
          width: 84px;
          height: 84px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(239, 68, 68, 0.12);
          border: 2px solid rgba(248, 113, 113, 0.65);
          box-shadow: 0 0 0 8px rgba(239, 68, 68, 0.08),
            0 0 40px rgba(239, 68, 68, 0.35);
          animation: evm-pulse-ring 1.6s ease-in-out infinite;
          margin-bottom: 20px;
        }

        @keyframes evm-pulse-ring {
          0%,
          100% {
            box-shadow: 0 0 0 8px rgba(239, 68, 68, 0.08),
              0 0 40px rgba(239, 68, 68, 0.35);
          }
          50% {
            box-shadow: 0 0 0 14px rgba(239, 68, 68, 0.14),
              0 0 60px rgba(239, 68, 68, 0.55);
          }
        }

        .evm-icon {
          font-size: 40px;
          line-height: 1;
          color: #fecaca;
        }

        .evm-title {
          margin: 0;
          font-size: clamp(22px, 6vw, 30px);
          font-weight: 800;
          letter-spacing: 0.06em;
          color: #fff1f1;
          text-shadow: 0 0 24px rgba(239, 68, 68, 0.6);
        }

        .evm-subtitle {
          margin: 10px 0 28px;
          font-size: clamp(15px, 4vw, 18px);
          font-weight: 600;
          letter-spacing: 0.18em;
          color: rgba(254, 202, 202, 0.85);
          text-transform: uppercase;
        }

        .evm-countdown {
          font-variant-numeric: tabular-nums;
          font-size: clamp(56px, 18vw, 88px);
          font-weight: 800;
          letter-spacing: 0.03em;
          color: #ffffff;
          text-shadow: 0 0 30px rgba(239, 68, 68, 0.7);
          transition: color 0.3s ease;
        }

        .evm-countdown-critical {
          color: #ff5c5c;
          animation: evm-flash 0.6s ease-in-out infinite;
        }

        @keyframes evm-flash {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.45;
          }
        }

        .evm-hint-slot {
          min-height: 28px;
          margin: 18px 0 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .evm-listening {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 500;
          color: rgba(254, 226, 226, 0.9);
        }

        .evm-listening-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: #4ade80;
          box-shadow: 0 0 8px rgba(74, 222, 128, 0.9);
          animation: evm-dot-pulse 1s ease-in-out infinite;
        }

        @keyframes evm-dot-pulse {
          0%,
          100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.4);
            opacity: 0.6;
          }
        }

        .evm-hint {
          font-size: 13px;
          color: rgba(254, 202, 202, 0.75);
        }

        .evm-button {
          margin-top: 18px;
          width: 100%;
          padding: 18px 24px;
          border-radius: 999px;
          border: none;
          background: linear-gradient(180deg, #ef4444, #b91c1c);
          color: #fff;
          font-size: 16px;
          font-weight: 700;
          letter-spacing: 0.05em;
          cursor: pointer;
          box-shadow: 0 10px 30px rgba(220, 38, 38, 0.45);
          transition: transform 0.15s ease, box-shadow 0.15s ease,
            opacity 0.15s ease;
        }

        .evm-button:active {
          transform: scale(0.97);
        }

        .evm-button:disabled {
          cursor: default;
        }

        .evm-button-active {
          background: linear-gradient(180deg, #7f1d1d, #450a0a);
          box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.2);
          opacity: 0.9;
        }

        .evm-footnote {
          margin-top: 16px;
          font-size: 12.5px;
          color: rgba(254, 226, 226, 0.55);
        }

        .evm-footnote strong {
          color: rgba(254, 226, 226, 0.85);
        }

        @media (min-width: 640px) {
          .evm-content {
            padding-bottom: 48px;
          }
        }
      `}</style>
    </div>
  );
};

export default EmergencyVerificationModal;

