import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { useState, useMemo } from "react";
import { Copy, Check, Phone, Wifi, Key, MapPin, Clock, Video, MessageCircle, Shield, ChevronDown, ChevronUp, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const t = {
  ro: {
    title: "Ghidul Oaspetelui",
    loading: "Se încarcă...",
    notFound: "Ghidul nu a fost găsit",
    notFoundDesc: "Verifică link-ul primit sau contactează-ne.",
    checkIn: "Check-in",
    checkOut: "Check-out",
    pinCode: "Cod Keybox Acces",
    pinLocked: "Codul keybox va fi vizibil în ziua check-in-ului",
    pinAvailable: "Codul tău de acces",
    wifi: "Wi-Fi",
    wifiName: "Rețea",
    wifiPass: "Parolă",
    copied: "Copiat!",
    copyWifi: "Copiază parola",
    accessInstructions: "Instrucțiuni de Acces",
    parking: "Parcare",
    openMaps: "Deschide în Google Maps",
    watchVideo: "Vezi videoul de acces",
    whatsappSupport: "Suport WhatsApp 24/7",
    whatsappMsg: "Salut! Am o întrebare legată de rezervarea mea",
    notes: "Informații Suplimentare",
    welcome: "Bine ai venit!",
    secureAccess: "Acces securizat prin link unic",
    showMore: "Mai multe detalii",
    showLess: "Mai puține detalii",
  },
  en: {
    title: "Guest Guide",
    loading: "Loading...",
    notFound: "Guide not found",
    notFoundDesc: "Please check the link you received or contact us.",
    checkIn: "Check-in",
    checkOut: "Check-out",
    pinCode: "Keybox Access Code",
    pinLocked: "The keybox code will be visible on your check-in day",
    pinAvailable: "Your access code",
    wifi: "Wi-Fi",
    wifiName: "Network",
    wifiPass: "Password",
    copied: "Copied!",
    copyWifi: "Copy password",
    accessInstructions: "Access Instructions",
    parking: "Parking",
    openMaps: "Open in Google Maps",
    watchVideo: "Watch access video",
    whatsappSupport: "WhatsApp Support 24/7",
    whatsappMsg: "Hi! I have a question about my booking",
    notes: "Additional Information",
    welcome: "Welcome!",
    secureAccess: "Secure access via unique link",
    showMore: "More details",
    showLess: "Less details",
  },
};

const GuestGuide = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const { language } = useLanguage();
  const lang = language === "ro" ? "ro" : "en";
  const labels = t[lang];
  const { toast } = useToast();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);

  const { data: guide, isLoading, error } = useQuery({
    queryKey: ["guest-guide", bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guest_guides")
        .select("*")
        .eq("booking_id", bookingId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!bookingId,
  });

  const isCheckInDay = useMemo(() => {
    if (!guide?.check_in_date) return false;
    const today = new Date().toISOString().slice(0, 10);
    const checkOut = guide.check_out_date;
    return today >= guide.check_in_date && today <= checkOut;
  }, [guide]);

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast({ title: labels.copied });
    setTimeout(() => setCopiedField(null), 2000);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr + "T00:00:00").toLocaleDateString(lang === "ro" ? "ro-RO" : "en-GB", {
      weekday: "short",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">{labels.loading}</div>
      </div>
    );
  }

  if (!guide || error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 text-center gap-4">
        <Home className="w-12 h-12 text-muted-foreground" />
        <h1 className="text-xl font-semibold text-foreground">{labels.notFound}</h1>
        <p className="text-muted-foreground text-sm max-w-xs">{labels.notFoundDesc}</p>
      </div>
    );
  }

  const whatsappUrl = `https://wa.me/${guide.whatsapp_number?.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(labels.whatsappMsg + ` (${guide.booking_id})`)}`;
  const mapsUrl = guide.parking_gps_lat && guide.parking_gps_lng
    ? `https://www.google.com/maps?q=${guide.parking_gps_lat},${guide.parking_gps_lng}`
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 py-6 text-center">
        <p className="text-xs uppercase tracking-widest opacity-80 mb-1">RealTrust & ApArt Hotel</p>
        <h1 className="text-lg font-bold">{labels.welcome}</h1>
        <p className="text-sm opacity-90 mt-1">{guide.property_name}</p>
      </div>

      {/* Property Image */}
      {guide.property_image && (
        <div className="w-full h-48 overflow-hidden">
          <img
            src={guide.property_image}
            alt={guide.property_name}
            className="w-full h-full object-cover"
            loading="eager"
          />
        </div>
      )}

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Check-in / Check-out */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Clock className="w-3.5 h-3.5" />
                  {labels.checkIn}
                </div>
                <p className="font-semibold text-sm text-foreground">{formatDate(guide.check_in_date)}</p>
                <p className="text-xs text-muted-foreground">{guide.check_in_time || "15:00"}</p>
              </div>
              <div className="text-center border-l border-border">
                <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Clock className="w-3.5 h-3.5" />
                  {labels.checkOut}
                </div>
                <p className="font-semibold text-sm text-foreground">{formatDate(guide.check_out_date)}</p>
                <p className="text-xs text-muted-foreground">{guide.check_out_time || "11:00"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PIN Code */}
        {guide.pin_code && (
          <Card className={isCheckInDay ? "border-primary/50 bg-primary/5" : ""}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Key className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm text-foreground">{labels.pinCode}</span>
              </div>
              {isCheckInDay ? (
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-2">{labels.pinAvailable}</p>
                  <div
                    className="font-mono text-3xl font-bold tracking-[0.4em] text-primary cursor-pointer select-all py-3 px-4 bg-primary/10 rounded-lg"
                    onClick={() => copyToClipboard(guide.pin_code!, "pin")}
                  >
                    {guide.pin_code}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {copiedField === "pin" ? "✓ " + labels.copied : "Tap to copy"}
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground bg-muted/50 rounded-lg p-3">
                  <Shield className="w-4 h-4 shrink-0" />
                  <p className="text-xs">{labels.pinLocked}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Wi-Fi */}
        {guide.wifi_name && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Wifi className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm text-foreground">{labels.wifi}</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{labels.wifiName}</p>
                    <p className="font-mono text-sm font-medium text-foreground">{guide.wifi_name}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => copyToClipboard(guide.wifi_name!, "ssid")}
                  >
                    {copiedField === "ssid" ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                {guide.wifi_password && (
                  <div className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{labels.wifiPass}</p>
                      <p className="font-mono text-sm font-medium text-foreground">{guide.wifi_password}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => copyToClipboard(guide.wifi_password!, "wifi")}
                    >
                      {copiedField === "wifi" ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Access Instructions (collapsible) */}
        {guide.access_instructions && (
          <Card>
            <CardContent className="p-4">
              <button
                className="w-full flex items-center justify-between"
                onClick={() => setShowInstructions(!showInstructions)}
              >
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-sm text-foreground">{labels.accessInstructions}</span>
                </div>
                {showInstructions ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </button>
              {showInstructions && (
                <div className="mt-3 text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                  {guide.access_instructions}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Access Video */}
        {guide.access_video_url && (
          <a
            href={guide.access_video_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-primary/10 hover:bg-primary/15 transition-colors rounded-xl p-4"
          >
            <Video className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-primary">{labels.watchVideo}</span>
          </a>
        )}

        {/* Parking */}
        {(guide.parking_instructions || mapsUrl) && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm text-foreground">{labels.parking}</span>
              </div>
              {guide.parking_instructions && (
                <p className="text-sm text-muted-foreground mb-3">{guide.parking_instructions}</p>
              )}
              {mapsUrl && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-primary font-medium hover:underline"
                >
                  <MapPin className="w-4 h-4" />
                  {labels.openMaps}
                </a>
              )}
            </CardContent>
          </Card>
        )}

        {/* Additional Notes */}
        {guide.additional_notes && (
          <Card>
            <CardContent className="p-4">
              <p className="font-semibold text-sm text-foreground mb-2">{labels.notes}</p>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{guide.additional_notes}</p>
            </CardContent>
          </Card>
        )}

        {/* WhatsApp CTA */}
        {guide.whatsapp_number && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 w-full bg-[#25D366] hover:bg-[#20BD5A] text-white font-semibold rounded-xl py-4 px-6 transition-colors shadow-lg"
          >
            <MessageCircle className="w-5 h-5" />
            {labels.whatsappSupport}
          </a>
        )}

        {/* Security badge */}
        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground pt-4 pb-8">
          <Shield className="w-3.5 h-3.5" />
          {labels.secureAccess}
        </div>
      </div>
    </div>
  );
};

export default GuestGuide;
