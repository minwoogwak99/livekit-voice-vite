import { useState, useEffect } from "react";
import {
  useParticipants,
  useLocalParticipant,
} from "@livekit/components-react";
import { Track, Participant } from "livekit-client";

/**
 * ParticipantsList component to display all connected participants
 * Shows audio activity and connection status based on LiveKit documentation
 */
export const ParticipantsList = () => {
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const [speakingParticipants, setSpeakingParticipants] = useState<Set<string>>(
    new Set()
  );
  const [audioLevels, setAudioLevels] = useState<Record<string, number>>({});

  // Monitor voice activity for all participants
  useEffect(() => {
    const analyzerMap = new Map<
      string,
      {
        analyser: AnalyserNode;
        dataArray: Uint8Array;
        animationFrameId: number;
      }
    >();

    const setupParticipantAudioAnalyzer = async (participant: Participant) => {
      const microphoneTrack = participant.getTrackPublication(
        Track.Source.Microphone
      );
      if (!microphoneTrack?.track || !microphoneTrack.isSubscribed) return;

      try {
        const audioTrack = microphoneTrack.track;
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
            setSpeakingParticipants((prev) => {
              const newSet = new Set(prev);
              newSet.delete(participant.identity);
              return newSet;
            });
            setAudioLevels((prev) => ({ ...prev, [participant.identity]: 0 }));

            const analyzerData = analyzerMap.get(participant.identity);
            if (analyzerData) {
              analyzerData.animationFrameId =
                requestAnimationFrame(detectVoiceActivity);
            }
            return;
          }

          analyser.getByteFrequencyData(dataArray);

          // Calculate RMS for audio level
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i] * dataArray[i];
          }
          const rms = Math.sqrt(sum / dataArray.length);
          const normalizedLevel = Math.min(rms / 128, 1);

          setAudioLevels((prev) => ({
            ...prev,
            [participant.identity]: normalizedLevel,
          }));

          // Voice activity detection threshold
          const speakingThreshold = 0.1;
          const isSpeaking = normalizedLevel > speakingThreshold;

          setSpeakingParticipants((prev) => {
            const newSet = new Set(prev);
            if (isSpeaking) {
              newSet.add(participant.identity);
            } else {
              newSet.delete(participant.identity);
            }
            return newSet;
          });

          const analyzerData = analyzerMap.get(participant.identity);
          if (analyzerData) {
            analyzerData.animationFrameId =
              requestAnimationFrame(detectVoiceActivity);
          }
        };

        const animationFrameId = requestAnimationFrame(detectVoiceActivity);

        analyzerMap.set(participant.identity, {
          analyser,
          dataArray,
          animationFrameId,
        });
      } catch (error) {
        console.error(
          `Error setting up audio analyzer for ${participant.identity}:`,
          error
        );
      }
    };

    // Setup analyzers for all participants
    participants.forEach((participant) => {
      setupParticipantAudioAnalyzer(participant);
    });

    return () => {
      // Cleanup all analyzers
      analyzerMap.forEach(({ animationFrameId }) => {
        cancelAnimationFrame(animationFrameId);
      });
      analyzerMap.clear();
    };
  }, [participants]);

  const getAudioStatus = (participant: any) => {
    const audioTrack = participant.getTrackPublication(Track.Source.Microphone);
    if (!audioTrack) return "No Audio";
    if (audioTrack.isMuted) return "Muted";

    const isSpeaking = speakingParticipants.has(participant.identity);
    return isSpeaking ? "Speaking" : "Silent";
  };

  const getParticipantType = (participant: any) => {
    return participant.identity === localParticipant?.identity
      ? "You"
      : "Remote";
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">
        Participants ({participants.length})
      </h3>

      {participants.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          No participants connected
        </div>
      ) : (
        <div className="space-y-3">
          {participants.map((participant) => {
            const isSpeaking = speakingParticipants.has(participant.identity);
            const audioLevel = audioLevels[participant.identity] || 0;
            const audioStatus = getAudioStatus(participant);

            return (
              <div
                key={participant.identity}
                className={`flex items-center justify-between p-3 bg-white rounded-lg shadow-sm border transition-all duration-200 ${
                  isSpeaking
                    ? "border-green-300 bg-green-50"
                    : "border-gray-200"
                }`}
              >
                <div className="flex flex-col flex-1">
                  <div className="flex items-center space-x-2">
                    {/* Speaking Indicator */}
                    <div
                      className={`w-3 h-3 rounded-full transition-all duration-200 ${
                        isSpeaking
                          ? "bg-green-500 animate-pulse shadow-lg"
                          : "bg-gray-300"
                      }`}
                    />

                    <div className="font-medium text-gray-800">
                      {participant.name || participant.identity}
                    </div>
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                      {getParticipantType(participant)}
                    </span>
                  </div>

                  <div className="text-sm text-gray-600 ml-5">
                    {participant.identity}
                  </div>

                  {/* Audio Level Bar */}
                  {audioStatus !== "No Audio" && (
                    <div className="ml-5 mt-1 flex items-center space-x-2">
                      <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-100 ${
                            isSpeaking ? "bg-green-500" : "bg-blue-400"
                          }`}
                          style={{ width: `${audioLevel * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">
                        {Math.round(audioLevel * 100)}%
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end space-y-1">
                  <div
                    className={`text-xs px-2 py-1 rounded-full transition-all duration-200 ${
                      audioStatus === "Speaking"
                        ? "bg-green-100 text-green-800 shadow-md"
                        : audioStatus === "Muted"
                        ? "bg-red-100 text-red-800"
                        : audioStatus === "Silent"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {audioStatus}
                  </div>

                  <div
                    className={`w-2 h-2 rounded-full ${
                      participant.connectionQuality === "excellent"
                        ? "bg-green-500"
                        : participant.connectionQuality === "good"
                        ? "bg-yellow-500"
                        : participant.connectionQuality === "poor"
                        ? "bg-red-500"
                        : "bg-gray-500"
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
