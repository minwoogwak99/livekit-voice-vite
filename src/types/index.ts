export interface RoomConfig {
  roomName: string;
  participantName: string;
  participantIdentity?: string;
}

export interface ConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  error?: string;
}

export type AudioStatus = "Speaking" | "Muted" | "No Audio";
export type ParticipantType = "You" | "Remote";
export type ConnectionQuality = "excellent" | "good" | "poor" | "unknown";
