/** Check dimensions of externally attached Story MP4s before saving. */
export async function renderStoryImage(url: string, text: string): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Fotografia nu poate fi folosită pentru Story."));
    image.src = url;
  });
  const canvas = document.createElement("canvas");
  canvas.width = 1080; canvas.height = 1920;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponibil.");
  const tokens = getComputedStyle(document.documentElement);
  const background = `hsl(${tokens.getPropertyValue("--background").trim()})`;
  const foreground = `hsl(${tokens.getPropertyValue("--foreground").trim()})`;
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, 1080, 1920);
  const scale = Math.min(1080 / img.width, 1920 / img.height);
  ctx.drawImage(img, (1080 - img.width * scale) / 2, (1920 - img.height * scale) / 2, img.width * scale, img.height * scale);
  ctx.font = "bold 54px sans-serif";
  let fontSize = 54;
  const longest = text.slice(0, 160).split(/\s+/).reduce((a, b) => a.length > b.length ? a : b, "");
  while (ctx.measureText(longest).width > 880 && fontSize > 16) {
    fontSize -= 2;
    ctx.font = `bold ${fontSize}px sans-serif`;
  }
  const lines: string[] = [];
  let line = "";
  for (const word of text.slice(0, 160).split(/\s+/)) {
    if (ctx.measureText(`${line} ${word}`).width > 880 && line) { lines.push(line); line = word; }
    else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  ctx.fillStyle = background;
  ctx.fillRect(60, 200, 960, 70 * lines.length + 72);
  ctx.fillStyle = foreground;
  lines.forEach((value, i) => ctx.fillText(value, 100, 276 + i * 70));
  return new Promise((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error("Export Story indisponibil.")), "image/jpeg", 0.92));
}

export function validateStoryVideo(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    const cleanup = () => {
      clearTimeout(timer);
      video.onloadedmetadata = null;
      video.onerror = null;
      video.removeAttribute("src");
      video.load();
    };
    const timer = setTimeout(() => { cleanup(); reject(new Error("Video-ul nu poate fi verificat. Verifică URL-ul MP4.")); }, 15000);
    video.onloadedmetadata = () => {
      const valid = video.videoWidth === 1080 && video.videoHeight === 1920;
      cleanup();
      if (valid) resolve();
      else reject(new Error("Story necesită un video vertical de 1080×1920 px (9:16)."));
    };
    video.onerror = () => { cleanup(); reject(new Error("Video-ul nu poate fi citit. Folosește un URL MP4 accesibil.")); };
    video.src = url;
  });
}