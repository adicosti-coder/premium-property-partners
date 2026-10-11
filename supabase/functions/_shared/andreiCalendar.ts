// Google Calendar pentru Andrei: sloturi libere + rezervare (discuție telefonică 15 min sau evaluare la apartament 60 min).
const GW = "https://connector-gateway.lovable.dev/google_calendar/calendar/v3";
const TZ = "Europe/Bucharest";
export type MeetingKind = "telefon" | "evaluare";
export type Slot = { start: string; end: string; label: string; kind: MeetingKind };

function headers() {
  const a = Deno.env.get("LOVABLE_API_KEY"), b = Deno.env.get("GOOGLE_CALENDAR_API_KEY");
  if (!a || !b) throw new Error("Google Calendar nu este conectat");
  return { Authorization: `Bearer ${a}`, "X-Connection-Api-Key": b, "Content-Type": "application/json" };
}
function tzOffsetMin(d: Date): number {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
    .formatToParts(d).map((x) => [x.type, x.value]));
  return (Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes())) / 60000;
}
/** Instant UTC pentru ora locală Bucharest (y-m-d h:00). */
function localToUtc(y: number, m: number, d: number, h: number): Date {
  const guess = new Date(Date.UTC(y, m, d, h));
  return new Date(guess.getTime() - tzOffsetMin(guess) * 60000);
}
const fmt = (d: Date) => new Intl.DateTimeFormat("ro-RO", { timeZone: TZ, weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(d);

export async function freeSlots(kind: MeetingKind, count = 3): Promise<Slot[]> {
  const dur = kind === "evaluare" ? 60 : 15;
  const now = new Date();
  const timeMax = new Date(now.getTime() + 7 * 864e5);
  const r = await fetch(`${GW}/freeBusy`, { method: "POST", headers: headers(), body: JSON.stringify({ timeMin: now.toISOString(), timeMax: timeMax.toISOString(), timeZone: TZ, items: [{ id: "primary" }] }) });
  if (!r.ok) throw new Error(`Calendar ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const busy = ((await r.json()).calendars?.primary?.busy ?? []).map((b: any) => [Date.parse(b.start), Date.parse(b.end)]);
  const out: Slot[] = [];
  const minStart = now.getTime() + 3 * 3600e3; // minim 3 ore preaviz
  for (let day = 0; day < 7 && out.length < count; day++) {
    const base = new Date(now.getTime() + day * 864e5);
    const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" }).formatToParts(base).map((x) => [x.type, x.value]));
    if (p.weekday === "Sun") continue;
    const lastHour = p.weekday === "Sat" ? 13 : 18;
    let perDay = 0;
    for (let h = 10; h < lastHour && out.length < count && perDay < 2; h++) {
      const s = localToUtc(+p.year, +p.month - 1, +p.day, h);
      const e = new Date(s.getTime() + dur * 60000);
      if (s.getTime() < minStart) continue;
      if (busy.some(([bs, be]: number[]) => s.getTime() < be && e.getTime() > bs)) continue;
      out.push({ start: s.toISOString(), end: e.toISOString(), label: fmt(s), kind });
      perDay++; h += 2; // distanțăm propunerile
    }
  }
  return out;
}

export async function bookSlot(slot: Slot, info: { name?: string | null; phone?: string | null; address?: string | null; listing?: string | null }) {
  // reverificăm disponibilitatea
  const fb = await fetch(`${GW}/freeBusy`, { method: "POST", headers: headers(), body: JSON.stringify({ timeMin: slot.start, timeMax: slot.end, timeZone: TZ, items: [{ id: "primary" }] }) });
  if (fb.ok && ((await fb.json()).calendars?.primary?.busy ?? []).length) throw new Error("Slotul nu mai este liber");
  const title = slot.kind === "evaluare" ? "Evaluare la apartament (Andrei AI)" : "Discuție telefonică 15 min (Andrei AI)";
  const r = await fetch(`${GW}/calendars/primary/events`, {
    method: "POST", headers: headers(),
    body: JSON.stringify({
      summary: `${title} — ${info.name || info.phone || "proprietar"}`,
      description: `Programat de Andrei în apel.\nTelefon: ${info.phone || "—"}\nAnunț: ${info.listing || "—"}`,
      location: slot.kind === "evaluare" ? (info.address || "La apartament (adresa se confirmă)") : undefined,
      start: { dateTime: slot.start, timeZone: TZ }, end: { dateTime: slot.end, timeZone: TZ },
    }),
  });
  if (!r.ok) throw new Error(`Calendar ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return await r.json();
}

/** Programările făcute de Andrei în următoarele 14 zile, îmbogățite cu proprietarul și tipul anunțului. */
export async function listUpcomingAndreiEvents(supabase: any) {
  const now = new Date();
  const qs = new URLSearchParams({ timeMin: now.toISOString(), timeMax: new Date(now.getTime() + 14 * 864e5).toISOString(), singleEvents: "true", orderBy: "startTime", q: "Andrei AI", maxResults: "50" });
  const r = await fetch(`${GW}/calendars/primary/events?${qs}`, { headers: headers() });
  if (!r.ok) throw new Error(`Calendar ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const items = ((await r.json()).items ?? []).filter((e: any) => /Andrei AI/.test(e.summary || ""));
  const out = [];
  for (const e of items) {
    const desc = String(e.description || "");
    const phone = desc.match(/Telefon:\s*([^\n]+)/)?.[1]?.trim() || null;
    const listing = desc.match(/Anunț:\s*([^\n]+)/)?.[1]?.trim() || null;
    let owner = String(e.summary || "").split("—")[1]?.trim() || null, category: string | null = null;
    const digits = (phone || "").replace(/\D/g, "").slice(-9);
    if (digits.length === 9) {
      const { data } = await supabase.from("prospect_listings").select("owner_name, category, title, zone").ilike("phone", `%${digits}`).limit(1).maybeSingle();
      if (data) { owner = data.owner_name || owner; category = data.category; }
    }
    out.push({ id: e.id, start: e.start?.dateTime || e.start?.date, end: e.end?.dateTime || e.end?.date, kind: /Evaluare/.test(e.summary) ? "evaluare" : "telefon", owner, phone, listing, category, link: e.htmlLink });
  }
  return out;
}
