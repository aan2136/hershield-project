// components/AudioMonitor.tsx
'use client';

import { useEffect, useRef } from 'react';

interface AudioMonitorProps {
  onScreamDetected: () => void;
}

const CHUNK_INTERVAL_MS = 2000;
const DETECT_ENDPOINT = 'http://localhost:8000/detect-scream';
const CONFIDENCE_THRESHOLD = 0.98;
const REQUIRED_CONSECUTIVE_HITS = 5;
const COOLDOWN_MS = 120000;

interface ScreamDetectionResponse {
  scream: boolean;
  confidence: number;
}

/**
 * Silently records the microphone in continuous 2-second chunks and forwards
 * each chunk to the Flask ML backend for scream detection. This component
 * performs NO local ML — it only calls the backend's /detect-scream API and
 * applies runtime debouncing (consecutive-hit requirement + cooldown) on top
 * of the backend's raw predictions to reduce false-positive emergencies.
 */
const AudioMonitor: React.FC<AudioMonitorProps> = ({ onScreamDetected }) => {
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const stoppedRef = useRef(false);

  // Rolling count of consecutive high-confidence scream predictions.
  const consecutiveHitsRef = useRef(0);
  // Timestamp (ms) until which new detections are ignored after a trigger.
  const cooldownUntilRef = useRef(0);

  useEffect(() => {
    stoppedRef.current = false;

    const sendChunk = async (blob: Blob) => {
      if (stoppedRef.current) return;

      // Ignore detections entirely while in cooldown after a recent trigger.
      if (Date.now() < cooldownUntilRef.current) {
        return;
      }

      try {
        const formData = new FormData();
        formData.append('audio', blob, 'chunk.webm');

        const response = await fetch(DETECT_ENDPOINT, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) return;
        if (stoppedRef.current || Date.now() < cooldownUntilRef.current) return;

        const result: ScreamDetectionResponse = await response.json();

        console.log("Scream Prediction:", result);

        const isHighConfidenceScream =
          result.scream === true && result.confidence >= CONFIDENCE_THRESHOLD;

        if (isHighConfidenceScream) {
          consecutiveHitsRef.current += 1;
        } else {
          consecutiveHitsRef.current = 0;
        }

        if (
          result.scream === true &&
          result.confidence >= CONFIDENCE_THRESHOLD &&
          consecutiveHitsRef.current >= REQUIRED_CONSECUTIVE_HITS
        ) {
          console.log("SOS triggered from SCREAM", result);
          consecutiveHitsRef.current = 0;
          cooldownUntilRef.current = Date.now() + COOLDOWN_MS;
          onScreamDetected();
        }
      } catch {
        // Network/backend error on this chunk — keep listening, next chunk
        // will try again. Do not count this as a hit or a miss.
      }
    };

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

        if (stoppedRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        const recorder = new MediaRecorder(stream);
        recorderRef.current = recorder;

        recorder.ondataavailable = (event: BlobEvent) => {
          if (event.data && event.data.size > 0) {
            sendChunk(event.data);
          }
        };

        recorder.start(CHUNK_INTERVAL_MS);
      } catch {
        // Microphone unavailable/denied after journey start — fail silently,
        // background monitoring simply won't run.
      }
    };

    start();

    return () => {
      stoppedRef.current = true;

      if (
        recorderRef.current &&
        recorderRef.current.state !== 'inactive'
      ) {
        recorderRef.current.stop();
      }
      recorderRef.current = null;

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
};

export default AudioMonitor;
