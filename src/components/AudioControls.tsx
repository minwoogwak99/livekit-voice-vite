import { useState, useEffect } from "react";
import { useLocalParticipant } from "@livekit/components-react";
import { Track } from "livekit-client";

/**
 * AudioControls component for managing microphone functionality
 * Provides toggle button for mute/unmute based on LiveKit documentation
 */
export const AudioControls = () => {
  const { localParticipant } = useLocalParticipant();
  const [isMuted, setIsMuted] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  const toggleMicrophone = async () => {
    if (!localParticipant) return;

    setIsConnecting(true);

    try {
      if (isMuted) {
        // Unmute - enable microphone
        await localParticipant.setMicrophoneEnabled(true);
        setIsMuted(false);
      } else {
        // Mute - disable microphone
        await localParticipant.setMicrophoneEnabled(false);
        setIsMuted(true);
      }
    } catch (error) {
      console.error("Error toggling microphone:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  const startAudioPublishing = async () => {
    if (!localParticipant) return;

    setIsConnecting(true);

    try {
      // Request microphone permission first
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });

      // Stop the stream as we'll let LiveKit handle it
      stream.getTracks().forEach((track) => track.stop());

      // Enable only microphone for audio-only functionality
      await localParticipant.setMicrophoneEnabled(true);
      setIsMuted(false);
    } catch (error) {
      console.error("Error starting audio publishing:", error);
      // Handle specific permission errors
      if (error instanceof Error && error.name === "NotAllowedError") {
        alert(
          "Microphone permission denied. Please allow microphone access and try again."
        );
      } else if (error instanceof Error && error.name === "NotFoundError") {
        alert(
          "No microphone found. Please connect a microphone and try again."
        );
      }
    } finally {
      setIsConnecting(false);
    }
  };

  // Monitor voice activity and audio levels
  useEffect(() => {
    if (!localParticipant) return;

    const microphoneTrack = localParticipant.getTrackPublication(
      Track.Source.Microphone
    );
    if (!microphoneTrack?.track) return;

    const audioTrack = microphoneTrack.track;
    let animationFrameId: number;

    // Create audio analyzer for voice activity detection
    const setupAudioAnalyzer = async () => {
      try {
        const mediaStreamTrack = audioTrack.mediaStreamTrack;
        if (!mediaStreamTrack) return;

        const audioContext = new AudioContext();
        const stream = new MediaStream([mediaStreamTrack]);
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();

        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.8;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const detectVoiceActivity = () => {
          if (!microphoneTrack.isEnabled || microphoneTrack.isMuted) {
            setIsSpeaking(false);
            setAudioLevel(0);
            animationFrameId = requestAnimationFrame(detectVoiceActivity);
            return;
          }

          analyser.getByteFrequencyData(dataArray);

          // Calculate RMS (Root Mean Square) for audio level
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i] * dataArray[i];
          }
          const rms = Math.sqrt(sum / dataArray.length);
          const normalizedLevel = Math.min(rms / 128, 1); // Normalize to 0-1

          setAudioLevel(normalizedLevel);

          // Voice activity detection threshold
          const speakingThreshold = 0.1; // Adjust this value as needed
          setIsSpeaking(normalizedLevel > speakingThreshold);

          animationFrameId = requestAnimationFrame(detectVoiceActivity);
        };

        detectVoiceActivity();

        return () => {
          cancelAnimationFrame(animationFrameId);
          audioContext.close();
        };
      } catch (error) {
        console.error("Error setting up audio analyzer:", error);
      }
    };

    setupAudioAnalyzer();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [localParticipant]);

  // Update muted state when track changes
  useEffect(() => {
    if (!localParticipant) return;

    const microphoneTrack = localParticipant.getTrackPublication(
      Track.Source.Microphone
    );
    if (microphoneTrack) {
      setIsMuted(microphoneTrack.isMuted);
    }
  }, [localParticipant]);

  // Check if participant has microphone track
  const hasMicrophoneTrack = localParticipant?.getTrackPublication(
    Track.Source.Microphone
  )?.isEnabled;

  return (
    <div className="flex flex-col items-center space-y-4 p-4 bg-gray-100 rounded-lg">
      <h3 className="text-lg font-semibold text-gray-800">Audio Controls</h3>

      {/* Speaking Indicator */}
      {hasMicrophoneTrack && (
        <div className="flex flex-col items-center space-y-2">
          <div
            className={`flex items-center space-x-2 px-3 py-1 rounded-full transition-all duration-200 ${
              isSpeaking
                ? "bg-green-100 text-green-800 shadow-lg scale-105"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full transition-all duration-200 ${
                isSpeaking ? "bg-green-500 animate-pulse" : "bg-gray-400"
              }`}
            />
            <span className="text-sm font-medium">
              {isSpeaking ? "Speaking..." : "Silent"}
            </span>
          </div>

          {/* Audio Level Visualizer */}
          <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-100 ${
                isSpeaking ? "bg-green-500" : "bg-blue-400"
              }`}
              style={{ width: `${audioLevel * 100}%` }}
            />
          </div>
          <span className="text-xs text-gray-500">
            Audio Level: {Math.round(audioLevel * 100)}%
          </span>
        </div>
      )}

      <div className="flex space-x-4">
        {!hasMicrophoneTrack ? (
          <button
            onClick={startAudioPublishing}
            disabled={isConnecting || !localParticipant}
            className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isConnecting ? "Connecting..." : "Start Audio"}
          </button>
        ) : (
          <button
            onClick={toggleMicrophone}
            disabled={isConnecting || !localParticipant}
            className={`px-6 py-2 text-white rounded-lg transition-colors ${
              isMuted
                ? "bg-red-500 hover:bg-red-600"
                : "bg-green-500 hover:bg-green-600"
            } disabled:bg-gray-400 disabled:cursor-not-allowed`}
          >
            {isConnecting ? "Processing..." : isMuted ? "Unmute" : "Mute"}
          </button>
        )}
      </div>

      <div className="text-sm text-gray-600">
        Status:{" "}
        {!localParticipant ? "Not connected" : isMuted ? "Muted" : "Active"}
      </div>
    </div>
  );
};
