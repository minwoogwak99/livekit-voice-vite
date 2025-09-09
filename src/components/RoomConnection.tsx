import { useState, useCallback } from "react";
import { Room, RoomEvent, DisconnectReason } from "livekit-client";
import { generateAccessToken, LIVEKIT_URL } from "../utils/tokenGenerator";
import { useLocalParticipant } from "@livekit/components-react";

interface RoomConnectionProps {
  room: Room;
  onConnectionChange: (connected: boolean) => void;
  onError: (error: string) => void;
}

/**
 * RoomConnection component handles the connection logic to LiveKit rooms
 * Based on the LiveKit client connection documentation
 */
export const RoomConnection = ({
  room,
  onConnectionChange,
  onError,
}: RoomConnectionProps) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [roomName, setRoomName] = useState("test-room");
  const [participantName, setParticipantName] = useState("");

  const { localParticipant } = useLocalParticipant();

  // Generate a default participant name
  const generateParticipantName = () => {
    return `User-${Math.random().toString(36).substr(2, 9)}`;
  };

  // Handle room connection
  const connectToRoom = useCallback(async () => {
    if (!roomName.trim()) {
      onError("Room name is required");
      return;
    }

    const finalParticipantName =
      participantName.trim() || generateParticipantName();
    setIsConnecting(true);

    try {
      // Generate access token for authentication
      const token = await generateAccessToken(roomName, finalParticipantName);

      // Set up room event listeners before connecting
      room.on(RoomEvent.Connected, () => {
        console.log("Connected to room:", roomName);
        setIsConnected(true);
        localParticipant.setMicrophoneEnabled(true);
        onConnectionChange(true);
      });

      room.on(RoomEvent.Disconnected, (reason?: DisconnectReason) => {
        console.log("Disconnected from room:", reason);
        setIsConnected(false);
        onConnectionChange(false);
        if (reason) {
          onError(`Disconnected: ${reason}`);
        }
      });

      room.on(RoomEvent.ConnectionQualityChanged, (quality, participant) => {
        console.log(
          "Connection quality changed:",
          quality,
          "for participant:",
          participant?.identity
        );
      });

      room.on(RoomEvent.Reconnecting, () => {
        console.log("Reconnecting to room...");
        onError("Reconnecting...");
      });

      room.on(RoomEvent.Reconnected, () => {
        console.log("Reconnected to room");
        onError(""); // Clear error
      });

      // Connect to the LiveKit room
      await room.connect(LIVEKIT_URL, token);
    } catch (error) {
      console.error("Failed to connect to room:", error);
      onError(
        `Failed to connect: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      setIsConnected(false);
      onConnectionChange(false);
    } finally {
      setIsConnecting(false);
    }
  }, [room, roomName, participantName, onConnectionChange, onError]);

  // Handle room disconnection
  const disconnectFromRoom = useCallback(async () => {
    try {
      await room.disconnect();
      setIsConnected(false);
      onConnectionChange(false);
    } catch (error) {
      console.error("Error disconnecting from room:", error);
      onError(
        `Disconnect error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }, [room, onConnectionChange, onError]);

  return (
    <div className="w-full max-w-md mx-auto p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">
        LiveKit Audio Room
      </h2>

      {!isConnected ? (
        <div className="space-y-4">
          <div>
            <label
              htmlFor="roomName"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Room Name
            </label>
            <input
              id="roomName"
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter room name"
              disabled={isConnecting}
            />
          </div>

          <div>
            <label
              htmlFor="participantName"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Your Name (optional)
            </label>
            <input
              id="participantName"
              type="text"
              value={participantName}
              onChange={(e) => setParticipantName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your name"
              disabled={isConnecting}
            />
          </div>

          <button
            onClick={connectToRoom}
            disabled={isConnecting || !roomName.trim()}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isConnecting ? "Connecting..." : "Join Room"}
          </button>
        </div>
      ) : (
        <div className="space-y-4 text-center">
          <div className="text-green-600 font-medium">
            ✓ Connected to "{roomName}"
          </div>

          <button
            onClick={disconnectFromRoom}
            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
          >
            Leave Room
          </button>
        </div>
      )}
    </div>
  );
};
