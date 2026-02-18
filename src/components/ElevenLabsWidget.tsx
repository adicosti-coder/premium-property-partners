import { useConversation } from "@elevenlabs/react";
import { useState, useCallback, useEffect } from "react";
import { Mic, MicOff, Volume2, Loader2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { useOptionalSharedAssistantContext } from "@/hooks/useSharedAssistantContext";
import { cn } from "@/lib/utils";

const AGENT_IDS = {
  ro: "agent_2601kgsvskeef4gvytn91he7x8y2",
  en: "agent_7201kgswwdaafzab2jqfreqbveb7",
};

// Hook for reusable ElevenLabs conversation logic
export function useElevenLabsVoice() {
  const { language } = useLanguage();
  const [isConnecting, setIsConnecting] = useState(false);
  const sharedContext = useOptionalSharedAssistantContext();

  const conversation = useConversation({
    onConnect: () => {
      console.log("[ElevenLabs] Connected to agent");
      sharedContext?.setActiveMode("voice");
    },
    onDisconnect: () => {
      console.log("[ElevenLabs] Disconnected from agent");
      sharedContext?.setActiveMode("none");
      sharedContext?.setVoiceTranscript("");
      sharedContext?.setIsVoiceSpeaking(false);
    },
    onMessage: (message) => {
      console.log("[ElevenLabs] Message:", message);
      // Add voice messages to shared context
      if (message.role === "user" && message.message) {
        sharedContext?.addMessage("user", message.message, "voice");
        sharedContext?.setVoiceTranscript("");
      } else if (message.role === "agent" && message.message) {
        sharedContext?.addMessage("assistant", message.message, "voice");
      }
    },
    onError: (error) => {
      console.error("[ElevenLabs] Error:", error);
      toast.error(
        language === "ro"
          ? "Eroare la conexiune. Vă rugăm încercați din nou."
          : "Connection error. Please try again."
      );
    },
  });

  // Update speaking state
  useEffect(() => {
    sharedContext?.setIsVoiceSpeaking(conversation.isSpeaking);
  }, [conversation.isSpeaking, sharedContext]);

  // Core function that starts conversation, optionally with a pre-acquired mic stream
  const startConversationWithStream = useCallback(async (preAcquiredStream?: MediaStream) => {
    if (isConnecting || conversation.status === "connected") return;

    setIsConnecting(true);
    
    let stream: MediaStream | null = preAcquiredStream || null;
    
    // Only request mic if no pre-acquired stream was provided
    if (!stream) {
      try {
        // Check if mediaDevices API is available (not available in some mobile contexts)
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw Object.assign(new Error("MediaDevices API not available"), { name: "NotSupportedError" });
        }
        stream = await navigator.mediaDevices.getUserMedia({ 
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } 
        });
        console.log("[ElevenLabs] Microphone access granted");
      } catch (error: any) {
        console.error("[ElevenLabs] Microphone access error:", error);
        setIsConnecting(false);
        if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
          toast.error(language === "ro" ? "Vă rugăm să permiteți accesul la microfon din setările browser-ului." : "Please allow microphone access in your browser settings.");
        } else if (error.name === "NotFoundError") {
          toast.error(language === "ro" ? "Nu s-a detectat niciun microfon." : "No microphone detected.");
        } else if (error.name === "NotSupportedError") {
          toast.error(language === "ro" ? "Browser-ul nu suportă accesul la microfon. Încercați din Chrome sau Safari." : "Browser does not support microphone access. Try Chrome or Safari.");
        } else {
          toast.error(language === "ro" ? "Eroare la accesarea microfonului." : "Error accessing microphone.");
        }
        return;
      }
    } else {
      console.log("[ElevenLabs] Using pre-acquired microphone stream");
    }

    try {
      console.log("[ElevenLabs] Requesting token for language:", language);
      const { data, error } = await supabase.functions.invoke("elevenlabs-conversation-token", { body: { language } });
      
      if (error) {
        console.error("[ElevenLabs] Token error:", error);
        stream?.getTracks().forEach(track => track.stop());
        throw new Error(error?.message || "Token request failed");
      }
      
      if (!data?.token) {
        console.error("[ElevenLabs] No token in response:", data);
        stream?.getTracks().forEach(track => track.stop());
        throw new Error("No token received from server");
      }
      
      console.log("[ElevenLabs] Token received for agent:", data.agentId, "- starting WebRTC session...");
      await conversation.startSession({ conversationToken: data.token, connectionType: "webrtc" });
      // Release the pre-acquired stream after WebRTC takes over
      stream?.getTracks().forEach(track => track.stop());
    } catch (error: any) {
      console.error("[ElevenLabs] Failed to start conversation:", error?.message || error);
      stream?.getTracks().forEach(track => track.stop());
      const msg = error?.message?.toLowerCase() || "";
      if (msg.includes("token") || msg.includes("401") || msg.includes("403")) {
        toast.error(language === "ro" ? "Eroare de autentificare. Verificați configurarea API." : "Authentication error. Check API configuration.");
      } else if (msg.includes("network") || msg.includes("fetch")) {
        toast.error(language === "ro" ? "Eroare de rețea. Verificați conexiunea la internet." : "Network error. Check your internet connection.");
      } else {
        toast.error(language === "ro" ? "Nu s-a putut porni conversația. Încercați din nou." : "Could not start conversation. Please try again.");
      }
    } finally {
      setIsConnecting(false);
    }
  }, [conversation, language, isConnecting]);

  const startConversation = useCallback(async () => {
    await startConversationWithStream();
  }, [startConversationWithStream]);

  const stopConversation = useCallback(async () => {
    await conversation.endSession();
  }, [conversation]);

  const toggleConversation = useCallback(() => {
    if (conversation.status === "connected") {
      stopConversation();
    } else {
      startConversation();
    }
  }, [conversation.status, startConversation, stopConversation]);

  return {
    conversation,
    isConnecting,
    isConnected: conversation.status === "connected",
    isSpeaking: conversation.isSpeaking,
    startConversation,
    startConversationWithStream,
    stopConversation,
    toggleConversation,
    language,
  };
}

// Desktop-only floating widget with chat integration
export function ElevenLabsWidget() {
  const {
    isConnecting,
    isConnected,
    isSpeaking,
    toggleConversation,
    startConversationWithStream,
    language,
    conversation,
  } = useElevenLabsVoice();
  
  const sharedContext = useOptionalSharedAssistantContext();

  // Register transfer callback
  useEffect(() => {
    sharedContext?.onTransferToVoice(() => {
      if (!isConnected && !isConnecting) {
        toggleConversation();
      }
    });
  }, [isConnected, isConnecting, toggleConversation, sharedContext]);

  const handleTransferToText = () => {
    // Stop voice and open text chat
    if (isConnected) {
      conversation.endSession();
    }
    sharedContext?.requestTransferToText();
  };

  // Broadcast voice state for FloatingActionMenu
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('elevenlabs-voice-state', {
      detail: { isConnecting, isConnected, isSpeaking }
    }));
  }, [isConnecting, isConnected, isSpeaking]);

  // Listen for toggle requests from FloatingActionMenu
  useEffect(() => {
    const handleToggle = (e: CustomEvent) => {
      if (conversation.status === "connected") {
        conversation.endSession();
      } else {
        // If a pre-acquired stream is passed (from mobile click handler), use it
        const preAcquiredStream = e.detail?.stream as MediaStream | undefined;
        startConversationWithStream(preAcquiredStream);
      }
    };
    window.addEventListener('elevenlabs-toggle-voice', handleToggle as EventListener);
    return () => window.removeEventListener('elevenlabs-toggle-voice', handleToggle as EventListener);
  }, [conversation, startConversationWithStream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (conversation.status === "connected") {
        conversation.endSession();
      }
    };
  }, []);

  return (
    // Hidden on mobile (md:flex), visible on desktop only
    <div className="fixed bottom-[336px] right-4 z-50 hidden md:flex flex-col items-end gap-2">
      {/* Voice state is active on all devices; UI only shown on desktop */}
      {/* Status indicator when connected */}
      {isConnected && (
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-full bg-background/95 backdrop-blur-sm border shadow-lg transition-all duration-300",
            isSpeaking ? "border-primary" : "border-muted"
          )}
        >
          <Volume2
            className={cn(
              "h-4 w-4",
              isSpeaking ? "text-primary animate-pulse" : "text-muted-foreground"
            )}
          />
          <span className="text-sm font-medium">
            {isSpeaking
              ? language === "ro"
                ? "Vorbește..."
                : "Speaking..."
              : language === "ro"
              ? "Ascult..."
              : "Listening..."}
          </span>
          {isSpeaking && (
            <div className="flex gap-0.5">
              <span className="w-1 h-3 bg-primary rounded-full animate-pulse" />
              <span className="w-1 h-4 bg-primary rounded-full animate-pulse delay-75" />
              <span className="w-1 h-2 bg-primary rounded-full animate-pulse delay-150" />
            </div>
          )}
          
          {/* Transfer to text button */}
          <Button
            size="sm"
            variant="ghost"
            onClick={handleTransferToText}
            className="ml-2 h-7 px-2 text-xs"
          >
            <MessageSquare className="h-3 w-3 mr-1" />
            {language === "ro" ? "Text" : "Text"}
          </Button>
        </div>
      )}

      {/* Main widget button */}
      <Button
        onClick={toggleConversation}
        disabled={isConnecting}
        size="lg"
        className={cn(
          "h-14 w-14 rounded-full shadow-xl transition-all duration-300",
          isConnected
            ? "bg-red-500 hover:bg-red-600 text-white"
            : "bg-primary hover:bg-primary/90"
        )}
        aria-label={
          isConnected
            ? language === "ro"
              ? "Oprește conversația"
              : "Stop conversation"
            : language === "ro"
            ? "Începe conversația vocală"
            : "Start voice conversation"
        }
      >
        {isConnecting ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : isConnected ? (
          <MicOff className="h-6 w-6" />
        ) : (
          <Mic className="h-6 w-6" />
        )}
      </Button>
    </div>
  );
}
