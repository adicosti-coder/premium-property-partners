/** Generează în browser un Reel vertical 1080×1920 din poze (≈2,5 s/poză, zoom lent). */
export const REEL_W = 1080;
export const REEL_H = 1920;

export function pickReelMime(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  const options = ["video/mp4;codecs=avc1.42E01E", "video/mp4;codecs=avc1", "video/mp4"];
  return options.find((t) => MediaRecorder.isTypeSupported(t)) ?? null;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function renderReelFromImages(urls: string[], secondsPerImage = 2.5): Promise<Blob> {
  const mime = pickReelMime();
  if (!mime) throw new Error("Browserul nu poate crea MP4. Folosește Chrome actualizat sau lipește un URL de video MP4.");
  const images = (await Promise.all([...new Set(urls)].slice(0, 8).map(loadImage))).filter((i): i is HTMLImageElement => !!i);
  if (!images.length) throw new Error("Nicio poză nu a putut fi încărcată pentru video.");
  const canvas = document.createElement("canvas");
  canvas.width = REEL_W; canvas.height = REEL_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponibil pentru generarea video-ului.");
  // Test anti-taint: dacă o poză blochează exportul, oprim cu mesaj clar.
  ctx.drawImage(images[0], 0, 0, 1, 1);
  try { canvas.toDataURL(); } catch { throw new Error("Pozele sunt pe un site care nu permite folosirea lor în video."); }

  const stream = canvas.captureStream(30);
  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  const done = new Promise<void>((r) => { recorder.onstop = () => r(); });
  recorder.start(250);

  const total = images.length * secondsPerImage * 1000;
  const start = performance.now();
  const drawPhoto = (img: HTMLImageElement, local: number) => {
    const scale = Math.max(REEL_W / img.width, REEL_H / img.height) * (1 + 0.06 * local);
    const w = img.width * scale, h = img.height * scale;
    ctx.drawImage(img, (REEL_W - w) / 2, (REEL_H - h) / 2, w, h);
  };
  await new Promise<void>((resolve) => {
    const frame = () => {
      const t = performance.now() - start;
      if (t >= total) return resolve();
      const idx = Math.min(images.length - 1, Math.floor(t / (secondsPerImage * 1000)));
      const local = (t % (secondsPerImage * 1000)) / (secondsPerImage * 1000);
      const img = images[idx];
      ctx.fillStyle = "#000"; ctx.fillRect(0, 0, REEL_W, REEL_H);
      if (idx > 0 && local < 0.15) {
        drawPhoto(images[idx - 1], 1);
        ctx.globalAlpha = local / 0.15;
      }
      drawPhoto(img, local);
      ctx.globalAlpha = 1;
      requestAnimationFrame(frame);
    };
    frame();
  });
  recorder.stop();
  await done;
  stream.getTracks().forEach((tr) => tr.stop());
  return new Blob(chunks, { type: "video/mp4" });
}
