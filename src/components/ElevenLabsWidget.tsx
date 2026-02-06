import { useConversation } from "@elevenlabs/react";
import { useState, useCallback, useEffect } from "react";
import { Mic, MicOff, Volume2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

const AGENT_IDS = {
  ro: "2601kgsvskeef4gvytn91he7x8y2",
  en: "7201kgswwdaafzab2jqfreqbveb7",
};

// Hook for reusable ElevenLabs conversation logic
export function useElevenLabsVoice() {
  const { language } = useLanguage();
  const [isConnecting, setIsConnecting] = useState(false);

  const conversation = useConversation({
    onConnect: () => {
      console.log("[ElevenLabs] Connected to agent");
    },
    onDisconnect: () => {
      console.log("[ElevenLabs] Disconnected from agent");
    },
    onMessage: (message) => {
      console.log("[ElevenLabs] Message:", message);
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

  const startConversation = useCallback(async () => {
    if (isConnecting || conversation.status === "connected") return;

    setIsConnecting(true);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const { data, error } = await supabase.functions.invoke(
        "elevenlabs-conversation-token",
        {
          body: { language },
        }
      );

      if (error || !data?.token) {
        throw new Error(error?.message || "No token received");
      }

      await conversation.startSession({
        conversationToken: data.token,
        connectionType: "webrtc",
      });
    } catch (error: any) {
      console.error("[ElevenLabs] Failed to start conversation:", error);

      if (error.name === "NotAllowedError") {
        toast.error(
          language === "ro"
            ? "Accesul la microfon este necesar pentru conversație vocală."
            : "Microphone access is required for voice conversation."
        );
      } else {
        toast.error(
          language === "ro"
            ? "Nu s-a putut porni conversația. Încercați din nou."
            : "Could not start conversation. Please try again."
        );
      }
    } finally {
      setIsConnecting(false);
    }
  }, [conversation, language, isConnecting]);

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
    stopConversation,
    toggleConversation,
    language,
  };
}

// Desktop-only floating widget
export function ElevenLabsWidget() {
  const {
    isConnecting,
    isConnected,
    isSpeaking,
    toggleConversation,
    language,
    conversation,
  } = useElevenLabsVoice();

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
      {/* Status indicator when connected */}
      {isConnected && (
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-full bg-background/95 backdrop-blur-sm border shadow-lg transition-all duration-300 ${
            isSpeaking ? "border-primary" : "border-muted"
          }`}
        >
          <Volume2
            className={`h-4 w-4 ${
              isSpeaking ? "text-primary animate-pulse" : "text-muted-foreground"
            }`}
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
        </div>
      )}

      {/* Main widget button */}
      <Button
        onClick={toggleConversation}
        disabled={isConnecting}
        size="lg"
        className={`h-14 w-14 rounded-full shadow-xl transition-all duration-300 ${
          isConnected
            ? "bg-red-500 hover:bg-red-600 text-white"
            : "bg-primary hover:bg-primary/90"
        }`}
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
