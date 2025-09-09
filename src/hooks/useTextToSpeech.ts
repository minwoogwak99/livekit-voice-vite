import { useCallback, useRef } from "react";

export interface TTSRequest {
  model: string;
  input: string;
  voice: string;
  response_format: string;
  download_format: string;
  speed: number;
  stream: boolean;
  return_download_link: boolean;
  lang_code?: string;
  volume_multiplier: number;
  normalization_options: {
    normalize: boolean;
    unit_normalization: boolean;
    url_normalization: boolean;
    email_normalization: boolean;
    optional_pluralization_normalization: boolean;
    phone_normalization: boolean;
    replace_remaining_symbols: boolean;
  };
}

export interface UseTextToSpeechOptions {
  endpoint?: string;
  model?: string;
  voice?: string;
  speed?: number;
  volume_multiplier?: number;
}

export function useTextToSpeech(options: UseTextToSpeechOptions = {}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const pendingTextRef = useRef<string | null>(null);

  const {
    endpoint = "https://api-hifi.8om.ai/v1/audio/speech",
    model = "kokoro",
    voice = "af_heart",
    speed = 1,
    volume_multiplier = 1,
  } = options;

  const speak = useCallback(
    async (text: string) => {
      try {
        const requestBody: TTSRequest = {
          model,
          input: text,
          // lang_code: "ko",
          voice,
          response_format: "mp3",
          download_format: "mp3",
          speed,
          stream: true,
          return_download_link: false,
          volume_multiplier,
          normalization_options: {
            normalize: true,
            unit_normalization: false,
            url_normalization: true,
            email_normalization: true,
            optional_pluralization_normalization: true,
            phone_normalization: true,
            replace_remaining_symbols: true,
          },
        };

        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          throw new Error(`TTS API error: ${response.status}`);
        }

        // Get audio blob from response
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);

        // Stop any currently playing audio
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }

        // Create and play new audio
        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          audioRef.current = null;
        };

        audio.onerror = (error) => {
          console.error("Audio playback error:", error);
          URL.revokeObjectURL(audioUrl);
          audioRef.current = null;
        };

        await audio.play();
      } catch (error) {
        console.error("Text-to-speech error:", error);
      }
    },
    [endpoint, model, voice, speed, volume_multiplier]
  );

  const speakWithDelay = useCallback(
    (text: string, delayMs: number = 1000) => {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout
      timeoutRef.current = setTimeout(() => {
        speak(text);
      }, delayMs);
    },
    [speak]
  );

  const speakWhenReady = useCallback((text: string) => {
    // Store the text to speak when conditions are right
    pendingTextRef.current = text;
  }, []);

  const triggerPendingSpeech = useCallback(() => {
    if (pendingTextRef.current) {
      speak(pendingTextRef.current);
      pendingTextRef.current = null;
    }
  }, [speak]);

  const cancelPendingSpeech = useCallback(() => {
    pendingTextRef.current = null;
  }, []);

  const stopSpeaking = useCallback(() => {
    // Clear timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Clear pending speech
    pendingTextRef.current = null;

    // Stop audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, []);

  return {
    speak,
    speakWithDelay,
    speakWhenReady,
    triggerPendingSpeech,
    cancelPendingSpeech,
    stopSpeaking,
    isPlaying: !!audioRef.current,
    hasPendingSpeech: !!pendingTextRef.current,
  };
}
