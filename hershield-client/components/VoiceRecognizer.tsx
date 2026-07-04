// components/VoiceRecognizer.tsx
'use client';
import { useEffect, useRef } from 'react';

interface VoiceRecognizerProps {
  onSuccess: () => void;
  onFailure: () => void;
}

// Minimal local type definitions for the Web Speech API.
// TypeScript's built-in DOM lib does not ship these types (the API is
// still non-standard / vendor-prefixed in most browsers), so we declare
// just the shape this component actually uses instead of relying on
// globals that don't exist in lib.dom.d.ts.
interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResultLike {
  readonly length: number;
  readonly isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultListLike {
  readonly length: number;
  [index: number]: SpeechRecognitionResultLike;
}

interface SpeechRecognitionEventLike extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultListLike;
}

interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

const ACCEPTED_PHRASES = ['i am safe', "i'm safe"];

const normalize = (text: string): string =>
  text
    .toLowerCase()
    .trim()
    .replace(/[.,!?]/g, '')
    .replace(/\s+/g, ' ');

const isAccepted = (text: string): boolean => {
  const normalized = normalize(text);
  return ACCEPTED_PHRASES.some(
    (phrase) => normalized === phrase || normalized.includes(phrase)
  );
};

const VoiceRecognizer: React.FC<VoiceRecognizerProps> = ({
  onSuccess,
  onFailure,
}) => {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const successRef = useRef(false);
  const stoppedRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognitionImpl: SpeechRecognitionCtor | undefined =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionImpl) {
      onFailure();
      return;
    }

    const recognition = new SpeechRecognitionImpl();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 3;

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result.isFinal) continue;

        let matched = false;
        for (let j = 0; j < result.length; j++) {
          if (isAccepted(result[j].transcript)) {
            matched = true;
            break;
          }
        }

        if (matched) {
          successRef.current = true;
          onSuccess();
        } else {
          onFailure();
        }
      }
    };

    recognition.onerror = () => {
      onFailure();
    };

    recognition.onend = () => {
      if (!stoppedRef.current && !successRef.current) {
        try {
          recognition.start();
        } catch {
          // Ignore errors from starting an already-started recognizer.
        }
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      onFailure();
    }

    return () => {
      stoppedRef.current = true;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try {
        recognition.stop();
      } catch {
        // Ignore errors from stopping an already-stopped recognizer.
      }
      recognitionRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
};

export default VoiceRecognizer;
