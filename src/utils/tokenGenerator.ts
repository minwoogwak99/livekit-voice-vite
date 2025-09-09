import { AccessToken } from "livekit-server-sdk";

// Configuration - in production, these should come from environment variables
const LIVEKIT_API_KEY = import.meta.env.VITE_LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = import.meta.env.VITE_LIVEKIT_API_SECRET;
export const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL;

/**
 * Generates an access token for LiveKit authentication
 * Based on the LiveKit documentation for token generation
 */
export async function generateAccessToken(
  roomName: string,
  participantName: string,
  participantIdentity?: string
): Promise<string> {
  try {
    // Create access token
    const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: participantIdentity || participantName,
      name: participantName,
    });

    // Grant permissions for audio-only room
    token.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    return await token.toJwt();
  } catch (error) {
    console.error("Error generating access token:", error);
    throw new Error("Failed to generate access token");
  }
}
