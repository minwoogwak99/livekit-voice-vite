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
      <h3 className="text-lg font-semibold text-gray-800">Audio Cossntrols</h3>

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
    </div>
  );
};
