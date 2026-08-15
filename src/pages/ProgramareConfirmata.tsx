import { useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarCheck2, CalendarPlus, Clock, Download, MessageCircle, Phone, ArrowLeft } from "lucide-react";
import { trackConversion, OWNER_FUNNEL_VALUE_EUR, attributionParams } from "@/lib/conversionTracking";
import { BRAND } from "@/lib/orgIdentity";

/**
 * Pagina de confirmare post-booking pentru apelul de 15 minute.
 * Primește prin URL: ?d=YYYY-MM-DD&t=HH:MM&n=<prenume>&id=<appointment_id>
 * Trimite conversia finală (schedule_call + purchase) o singură dată per programare.
 */

const pad = (n: number) => `${n}`.padStart(2, "0");
const stamp = (d: Date) =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(
    d.getUTCMinutes(),
  )}00Z`;

/** Romania offset: UTC+3 summer / UTC+2 winter (DST = last Sunday of March → last Sunday of October). */
const romaniaOffset = (y: number, m: number, d: number) => {
  const lastSunday = (year: number, monthIndex: number) => {
    const last = new Date(Date.UTC(year, monthIndex + 1, 0));
    return last.getUTCDate() - last.getUTCDay();
  };
  const afterMarch = m > 3 || (m === 3 && d >= lastSunday(y, 2));
  const beforeOctober = m < 10 || (m === 10 && d < lastSunday(y, 9));
  return afterMarch && beforeOctober ? 3 : 2;
};

const ProgramareConfirmata = () => {
  const [params] = useSearchParams();
  const { language } = useLanguage();
  const isRo = language === "ro";

  const date = params.get("d") ?? "";
  const slot = params.get("t") ?? "";
  const name = (params.get("n") ?? "").slice(0, 40);
  const appointmentId = params.get("id") ?? "";
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(date) && /^([01]\d|2[0-3]):[0-5]\d$/.test(slot);

  const { startUtc, endUtc, prettyDate } = useMemo(() => {
    if (!valid) return { startUtc: null as Date | null, endUtc: null as Date | null, prettyDate: "" };
    const [y, m, d] = date.split("-").map(Number);
    const [hh, mm] = slot.split(":").map(Number);
    const offset = romaniaOffset(y, m, d);
    const start = new Date(Date.UTC(y, m - 1, d, hh - offset, mm));
    return {
      startUtc: start,
      endUtc: new Date(start.getTime() + 15 * 60 * 1000),
      prettyDate: new Date(y, m - 1, d).toLocaleDateString(isRo ? "ro-RO" : "en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    };
  }, [date, slot, valid, isRo]);

  // Conversia finală: o singură dată per programare (sessionStorage guard pentru refresh).
  useEffect(() => {
    if (!valid) return;
    const key = `call_conv_${appointmentId || `${date}${slot}`}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    const attribution = attributionParams();
    trackConversion({
      event: "schedule_call",
      source: "owners_call_15min",
      value: OWNER_FUNNEL_VALUE_EUR.scheduledCall,
      currency: "EUR",
      transaction_id: appointmentId || undefined,
      booking_date: date,
      booking_slot: slot,
      ...attribution,
    });
    trackConversion({
      event: "purchase",
      source: "owners_call_15min",
      value: OWNER_FUNNEL_VALUE_EUR.scheduledCall,
      currency: "EUR",
      transaction_id: appointmentId || undefined,
      ...attribution,
    });
  }, [valid, appointmentId, date, slot]);

  const title = isRo ? "Apel confirmat — 15 minute" : "Call confirmed — 15 minutes";
  const summary = isRo
    ? "Apel strategic de 15 minute cu RealTrust Timișoara: estimare de venit pentru apartamentul tău."
    : "15-minute strategy call with RealTrust Timișoara: income estimate for your apartment.";

  const gcalUrl =
    startUtc && endUtc
      ? `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
          isRo ? "Call RealTrust — 15 min" : "RealTrust call — 15 min",
        )}&dates=${stamp(startUtc)}/${stamp(endUtc)}&details=${encodeURIComponent(summary)}&location=${encodeURIComponent(
          isRo ? "Telefonic" : "Phone call",
        )}`
      : "#";

  const outlookUrl =
    startUtc && endUtc
      ? `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=${encodeURIComponent(
          isRo ? "Call RealTrust — 15 min" : "RealTrust call — 15 min",
        )}&startdt=${startUtc.toISOString()}&enddt=${endUtc.toISOString()}&body=${encodeURIComponent(summary)}`
      : "#";

  const downloadIcs = () => {
    if (!startUtc || !endUtc) return;
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//RealTrust//Owner Call//RO",
      "BEGIN:VEVENT",
      `UID:${appointmentId || `${date}${slot}`}@realtrust.ro`,
      `DTSTAMP:${stamp(new Date())}`,
      `DTSTART:${stamp(startUtc)}`,
      `DTEND:${stamp(endUtc)}`,
      `SUMMARY:${isRo ? "Call RealTrust — 15 min" : "RealTrust call — 15 min"}`,
      `DESCRIPTION:${summary}`,
      "BEGIN:VALARM",
      "TRIGGER:-PT2H",
      "ACTION:DISPLAY",
      `DESCRIPTION:${isRo ? "Apel RealTrust în 2 ore" : "RealTrust call in 2 hours"}`,
      "END:VALARM",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "call-realtrust.ics";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Helmet>
        <title>{`${title} | RealTrust Timișoara`}</title>
        <meta
          name="description"
          content={
            isRo
              ? "Programarea apelului de 15 minute cu RealTrust Timișoara este confirmată. Adaugă apelul în calendar și pregătește datele apartamentului."
              : "Your 15-minute call with RealTrust Timișoara is confirmed. Add it to your calendar and prepare your apartment details."
          }
        />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <main className="min-h-[70vh] py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-2xl">
          <Card className="border-primary/20 shadow-sm">
            <CardContent className="p-6 md:p-10 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5">
                <CalendarCheck2 className="w-8 h-8 text-primary" aria-hidden="true" />
              </div>

              <Badge variant="outline" className="mb-4 border-primary/30 bg-primary/5">
                {isRo ? "Programare confirmată" : "Booking confirmed"}
              </Badge>

              <h1 className="text-2xl md:text-3xl font-bold mb-3">
                {name
                  ? isRo
                    ? `${name}, apelul tău este confirmat`
                    : `${name}, your call is confirmed`
                  : isRo
                    ? "Apelul tău este confirmat"
                    : "Your call is confirmed"}
              </h1>

              {valid ? (
                <p className="text-muted-foreground mb-2">
                  {isRo ? "Te sunăm " : "We'll call you on "}
                  <strong className="text-foreground capitalize">{prettyDate}</strong>
                  {isRo ? ", la ora " : " at "}
                  <strong className="text-foreground">{slot}</strong>
                  {isRo ? " (ora României)." : " (Romania time)."}
                </p>
              ) : (
                <p className="text-muted-foreground mb-2">
                  {isRo
                    ? "Programarea a fost înregistrată. Te contactăm pentru confirmarea intervalului."
                    : "Your booking is registered. We'll contact you to confirm the slot."}
                </p>
              )}

              <p className="text-sm text-muted-foreground flex items-center justify-center gap-2 mb-8">
                <Clock className="w-4 h-4" aria-hidden="true" />
                {isRo ? "Durată: 15 minute, fără obligații" : "Duration: 15 minutes, no obligation"}
              </p>

              {valid && (
                <div className="grid sm:grid-cols-3 gap-3 mb-8">
                  <Button asChild variant="default" className="min-h-12">
                    <a href={gcalUrl} target="_blank" rel="noopener noreferrer" aria-label="Google Calendar">
                      <CalendarPlus className="w-4 h-4 mr-2" aria-hidden="true" />
                      Google Calendar
                    </a>
                  </Button>
                  <Button asChild variant="outline" className="min-h-12">
                    <a href={outlookUrl} target="_blank" rel="noopener noreferrer" aria-label="Outlook">
                      <CalendarPlus className="w-4 h-4 mr-2" aria-hidden="true" />
                      Outlook
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    className="min-h-12"
                    onClick={downloadIcs}
                    aria-label={isRo ? "Descarcă fișier calendar (.ics)" : "Download calendar file (.ics)"}
                  >
                    <Download className="w-4 h-4 mr-2" aria-hidden="true" />
                    {isRo ? "Apple / .ics" : "Apple / .ics"}
                  </Button>
                </div>
              )}

              <div className="text-left bg-muted/50 rounded-lg p-5 mb-8">
                <p className="font-semibold mb-2">{isRo ? "Ca să fie util pentru tine:" : "To make it useful:"}</p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
                  <li>{isRo ? "zona / adresa apartamentului" : "the apartment's area / address"}</li>
                  <li>{isRo ? "număr de camere și suprafață" : "number of rooms and size"}</li>
                  <li>{isRo ? "dacă este mobilat și în ce stare" : "whether it's furnished and in what condition"}</li>
                  <li>{isRo ? "de când ar fi disponibil" : "when it would be available"}</li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild variant="secondary" className="min-h-12">
                  <a href={`tel:${BRAND.telephone}`} aria-label={isRo ? "Sună acum" : "Call now"}>
                    <Phone className="w-4 h-4 mr-2" aria-hidden="true" />
                    {isRo ? "Sună acum" : "Call now"}
                  </a>
                </Button>
                <Button asChild variant="outline" className="min-h-12">
                  <a
                    href="https://wa.me/40799069256"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={isRo ? "Scrie pe WhatsApp" : "Message on WhatsApp"}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" aria-hidden="true" />
                    WhatsApp
                  </a>
                </Button>
              </div>

              <div className="mt-8">
                <Link
                  to="/pentru-proprietari"
                  className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                  {isRo ? "Înapoi la pagina pentru proprietari" : "Back to the owners page"}
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
};

export default ProgramareConfirmata;
