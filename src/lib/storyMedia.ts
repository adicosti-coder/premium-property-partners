/** Check dimensions of externally attached Story MP4s before saving. */
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