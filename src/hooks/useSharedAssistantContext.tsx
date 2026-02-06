import { createContext, useContext, useState, useCallback, useRef, ReactNode } from "react";

export interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  source: "text" | "voice";
}

interface SharedAssistantContextType {
  // Shared conversation history
  messages: AssistantMessage[];
  addMessage: (role: "user" | "assistant", content: string, source: "text" | "voice") => void;
  clearMessages: () => void;
  
  // Active mode tracking
  activeMode: "none" | "text" | "voice";
  setActiveMode: (mode: "none" | "text" | "voice") => void;
  
  // Transfer control
  requestTransferToVoice: () => void;
  requestTransferToText: () => void;
  onTransferToVoice: (callback: () => void) => void;
  onTransferToText: (callback: () => void) => void;
  
  // Get conversation summary for context handoff
  getConversationSummary: () => string;
  
  // Voice transcription display in chat
  voiceTranscript: string;
  setVoiceTranscript: (transcript: string) => void;
  isVoiceSpeaking: boolean;
  setIsVoiceSpeaking: (speaking: boolean) => void;
}

const SharedAssistantContext = createContext<SharedAssistantContextType | null>(null);

export const SharedAssistantProvider = ({ children }: { children: ReactNode }) => {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [activeMode, setActiveMode] = useState<"none" | "text" | "voice">("none");
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [isVoiceSpeaking, setIsVoiceSpeaking] = useState(false);
  
  // Callback refs for transfer requests
  const transferToVoiceCallback = useRef<(() => void) | null>(null);
  const transferToTextCallback = useRef<(() => void) | null>(null);

  const addMessage = useCallback((role: "user" | "assistant", content: string, source: "text" | "voice") => {
    if (!content.trim()) return;
    
    const newMessage: AssistantMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role,
      content: content.trim(),
      timestamp: new Date(),
      source,
    };
    
    setMessages((prev) => [...prev, newMessage]);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const requestTransferToVoice = useCallback(() => {
    if (transferToVoiceCallback.current) {
      transferToVoiceCallback.current();
    }
  }, []);

  const requestTransferToText = useCallback(() => {
    if (transferToTextCallback.current) {
      transferToTextCallback.current();
    }
  }, []);

  const onTransferToVoice = useCallback((callback: () => void) => {
    transferToVoiceCallback.current = callback;
  }, []);

  const onTransferToText = useCallback((callback: () => void) => {
    transferToTextCallback.current = callback;
  }, []);

  const getConversationSummary = useCallback(() => {
    if (messages.length === 0) return "";
    
    // Get last 5 messages for context
    const recentMessages = messages.slice(-5);
    const summary = recentMessages
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content.slice(0, 200)}${m.content.length > 200 ? "..." : ""}`)
      .join("\n");
    
    return summary;
  }, [messages]);

  return (
    <SharedAssistantContext.Provider
      value={{
        messages,
        addMessage,
        clearMessages,
        activeMode,
        setActiveMode,
        requestTransferToVoice,
        requestTransferToText,
        onTransferToVoice,
        onTransferToText,
        getConversationSummary,
        voiceTranscript,
        setVoiceTranscript,
        isVoiceSpeaking,
        setIsVoiceSpeaking,
      }}
    >
      {children}
    </SharedAssistantContext.Provider>
  );
};

export const useSharedAssistantContext = () => {
  const context = useContext(SharedAssistantContext);
  if (!context) {
    throw new Error("useSharedAssistantContext must be used within a SharedAssistantProvider");
  }
  return context;
};

// Optional hook for components that might be outside the provider
export const useOptionalSharedAssistantContext = () => {
  return useContext(SharedAssistantContext);
};
