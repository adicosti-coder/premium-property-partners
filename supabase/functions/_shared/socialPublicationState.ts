export type PublicationResult = { platform: string; ok: boolean; id?: string; error?: string };

/** Only confirmed external IDs count as delivery, including partial delivery. */
export function publicationState(previous: string[], results: PublicationResult[]) {
  const confirmed = results.filter(r => r.ok && !!r.id).map(r => r.platform);
  const posted_to = [...new Set([...previous, ...confirmed])];
  const last_error = results.filter(r => !r.ok || !r.id)
    .map(r => `${r.platform}: ${r.error || "Publicarea nu a fost confirmată de rețea"}`).join(" · ") || null;
  return { status: posted_to.length ? "posted" : "draft", posted_to, last_error, scheduled_at: null };
}

export function makePublicationResult(platform: string, body: string): PublicationResult {
  try {
    const data = JSON.parse(body);
    const id = data.external_id || data.post_id;
    if ((data.success === true || data.status === "posted") && typeof id === "string" && id.trim()) {
      return { platform, ok: true, id };
    }
    return { platform, ok: false, error: typeof data.error === "string" ? data.error : "Make a primit cererea, dar publicarea nu este confirmată. Verifică scenariul înainte de reprogramare." };
  } catch {
    return { platform, ok: false, error: "Make a primit cererea, dar publicarea nu este confirmată. Verifică scenariul înainte de reprogramare." };
  }
}