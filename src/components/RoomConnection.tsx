import { useState, useCallback } from "react";
import { Room, RoomEvent, DisconnectReason } from "livekit-client";
import { generateAccessToken, LIVEKIT_URL } from "../utils/tokenGenerator";
import { useLocalParticipant } from "@livekit/components-react";
import { AgentDispatchClient } from "livekit-server-sdk";
import { v4 as uuidv4 } from "uuid";

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

  const { localParticipant } = useLocalParticipant();
  const agentDispatchClient = new AgentDispatchClient(
    import.meta.env.VITE_LIVEKIT_URL,
    import.meta.env.VITE_LIVEKIT_API_KEY,
    import.meta.env.VITE_LIVEKIT_API_SECRET
  );

  // Generate a default participant name
  const generateParticipantName = () => {
    return `User-${Math.random().toString(36).substring(2, 9)}`;
  };

  const finalParticipantName = generateParticipantName();
  const roomName = "Room-" + uuidv4().split("-")[0];

  // Handle room connection
  const connectToRoom = useCallback(async () => {
    if (!roomName.trim()) {
      onError("Room name is required");
      return;
    }

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

      // Dispatch agent ot the livekit room
      const dispatch = await agentDispatchClient.createDispatch(
        roomName,
        "test-agent-2" // testing //TODO: move to env variable - wrangler
      );
      console.log("DISPATCH CREATED::", dispatch);

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
  }, [room, roomName, onConnectionChange, onError]);

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
      {!isConnected ? (
        <button
          onClick={connectToRoom}
          disabled={isConnecting || !roomName.trim()}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isConnecting ? "Connecting..." : "Join Room"}
        </button>
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
