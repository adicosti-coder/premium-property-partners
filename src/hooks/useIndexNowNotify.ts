import { supabase } from "@/integrations/supabase/client";

/**
 * Notify IndexNow about new/updated URLs so search engines index them faster.
 * Silently fails — never blocks the UI.
 */
export async function notifyIndexNow(urls: string[]) {
  if (!urls.length) return;
  try {
    await supabase.functions.invoke("indexnow-notify", {
      body: { urls },
    });
  } catch {
    // Fire-and-forget — don't disrupt the user flow
  }
}
