import { useState } from "react";
import {
  RoomAudioRenderer,
  RoomContext,
  StartAudio,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Room } from "livekit-client";

// Components
import { RoomConnection } from "./components/RoomConnection";
import { AudioControls } from "./components/AudioControls";
import { ParticipantsList } from "./components/ParticipantsList";
import { DeviceCheck } from "./components/DeviceCheck";
import { ChatTranscription } from "./components/ChatTranscription";

/**
 * Main App component - Audio-only LiveKit implementation
 * Componentized structure following LiveKit best practices
 */
const App = () => {
  const [room] = useState(() => new Room());
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string>("");

  const handleConnectionChange = (connected: boolean) => {
    setIsConnected(connected);
    if (connected) {
      setError(""); // Clear any errors when successfully connected
    }
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
            LiveKit Audio Room
          </h1>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          <RoomContext.Provider value={room}>
            <RoomAudioRenderer />
            <StartAudio label="Start Audio" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Connection and Controls */}
              <div className="space-y-6">
                {/* Device Check Component */}
                <DeviceCheck />

                {/* Room Connection Component */}
                <RoomConnection
                  room={room}
                  onConnectionChange={handleConnectionChange}
                  onError={handleError}
                />

                {/* Audio Controls - Only show when connected */}
                {isConnected && <AudioControls />}
              </div>

              {/* Right Column - Participants and Transcription */}
              <div className="space-y-6">
                {/* Participants List - Only show when connected */}
                {isConnected && (
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <ParticipantsList />
                  </div>
                )}

                {/* Chat Transcription - Only show when connected */}
                {isConnected && <ChatTranscription />}

                {/* Connection Status Info */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">
                    Connection Status
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span
                        className={`font-medium ${
                          isConnected ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {isConnected ? "Connected" : "Disconnected"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Room:</span>
                      <span className="text-gray-800">
                        {room.name || "Not connected"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Participant ID:</span>
                      <span className="text-gray-800">
                        {room.localParticipant?.identity || "N/A"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </RoomContext.Provider>
        </div>
      </div>
    </div>
  );
};

export default App;
