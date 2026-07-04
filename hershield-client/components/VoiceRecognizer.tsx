// components/VoiceRecognizer.tsx
'use client';

import { useEffect, useRef } from 'react';

interface VoiceRecognizerProps {
  onSuccess: () => void;
  onFailure: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognition;

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
  const recognitionRef = useRef<SpeechRecognition | null>(null);
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

    recognition.onresult = (event: SpeechRecognitionEvent) => {
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
