import { useState, useRef, useMemo } from "react";
import {
  useParticipants,
  useLocalParticipant,
  type TextStreamData,
  useTranscriptions,
  useChat,
  useRoomContext,
  type ReceivedChatMessage,
} from "@livekit/components-react";
// import { useTextToSpeech } from "../hooks/useTextToSpeech";

/**
 * ChatTranscription component for displaying real-time speech transcriptions
 * Based on LiveKit's transcription capabilities and documentation
 */
export const ChatTranscription = () => {
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();
  const [manualMessage, setManualMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const transcriptions: TextStreamData[] = useTranscriptions();
  const chat = useChat();
  // const { speak } = useTextToSpeech();

  console.log("Transcriptions received:", transcriptions);
  console.log("Chat messages:", chat.chatMessages);

  // Convert transcriptions to chat message format
  const transcriptionToChatMessage = (
    textStream: TextStreamData
  ): ReceivedChatMessage => {
    return {
      id: textStream.streamInfo.id,
      timestamp: textStream.streamInfo.timestamp,
      message: textStream.text,
      from:
        textStream.participantInfo.identity === room?.localParticipant.identity
          ? room.localParticipant
          : Array.from(room?.remoteParticipants.values() || []).find(
              (p) => p.identity === textStream.participantInfo.identity
            ),
    };
  };

  // Merge transcriptions and chat messages
  const mergedMessages = useMemo(() => {
    const merged: Array<ReceivedChatMessage> = [
      ...transcriptions.map((transcription) =>
        transcriptionToChatMessage(transcription)
      ),
      ...chat.chatMessages,
    ];
    return merged.sort((a, b) => a.timestamp - b.timestamp);
  }, [transcriptions, chat.chatMessages, room]);

  // useEffect(() => {
  //   const lastMessage = mergedMessages[mergedMessages.length - 1];

  //   const timer = setTimeout(() => {
  //     speak(lastMessage.message);
  //   }, 1_500);

  //   return () => clearTimeout(timer);
  // }, [mergedMessages]);

  const sendManualMessage = async () => {
    if (!manualMessage.trim() || !localParticipant) return;

    try {
      // Send message using the chat hook
      await chat.send(manualMessage.trim());
      setManualMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendManualMessage();
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md h-[500px] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800">
          Live Transcription & Chat
        </h3>
        <div className="text-sm text-gray-600">
          {transcriptions.length} transcription
          {transcriptions.length !== 1 ? "s" : ""}, {chat.chatMessages.length}{" "}
          message{chat.chatMessages.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {mergedMessages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <div className="text-sm">Start speaking or send a message</div>
            <div className="text-xs mt-1 text-gray-400">
              Real-time transcriptions and chat will appear here
            </div>
          </div>
        ) : (
          mergedMessages.map((message) => (
            <div key={message.id} className="flex flex-col space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                  {message.from?.name || message.from?.identity || "Unknown"}
                </span>
                <span className="text-xs text-gray-500">
                  {formatTime(message.timestamp)}
                </span>
                <span className="text-xs text-gray-400">
                  {transcriptions.some((t) => t.streamInfo.id === message.id)
                    ? "🗣️ Voice"
                    : "💬 Text"}
                </span>
              </div>
              <div className="text-sm p-2 rounded-lg bg-gray-50 text-gray-800">
                {message.message}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-3 border-t border-gray-200">
        <div className="flex space-x-2">
          <input
            type="text"
            value={manualMessage}
            onChange={(e) => setManualMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={!localParticipant}
          />
          <button
            onClick={sendManualMessage}
            disabled={!manualMessage.trim() || !localParticipant}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
          >
            Send
          </button>
        </div>
      </div>

      {/* Status */}
      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <div className="flex justify-between items-center text-xs text-gray-600">
          <span>
            {mergedMessages.length} total message
            {mergedMessages.length !== 1 ? "s" : ""}
          </span>
          <span>
            {participants.length} participant
            {participants.length !== 1 ? "s" : ""} connected
          </span>
        </div>
      </div>
    </div>
  );
};
