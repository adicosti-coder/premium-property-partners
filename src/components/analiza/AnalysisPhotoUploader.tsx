import { useCallback, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, ImagePlus, Loader2, Trash2 } from "lucide-react";

export interface AnalysisPhoto {
  id: string;
  dataUrl: string;
  name: string;
  sizeKb: number;
  width: number;
  height: number;
  orientation: "landscape" | "portrait" | "square";
}

interface Props {
  photos: AnalysisPhoto[];
  onChange: (photos: AnalysisPhoto[]) => void;
  maxPhotos?: number;
}

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_MB = 10;
const MIN_DIMENSION = 600;

const readFile = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("read_failed"));
    reader.readAsDataURL(file);
  });

const measure = (dataUrl: string) =>
  new Promise<{ width: number; height: number }>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("decode_failed"));
    img.src = dataUrl;
  });

const AnalysisPhotoUploader = ({ photos, onChange, maxPhotos = 8 }: Props) => {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      const files = Array.from(fileList);
      const room = maxPhotos - photos.length;

      if (room <= 0) {
        toast.error(`Ai atins limita de ${maxPhotos} fotografii. Șterge una înainte să adaugi alta.`);
        return;
      }
      if (files.length > room) {
        toast.warning(`Poți adăuga încă ${room} fotografii. Restul au fost ignorate.`);
      }

      setBusy(true);
      const accepted: AnalysisPhoto[] = [];
      const rejected: string[] = [];

      for (const file of files.slice(0, room)) {
        if (!ACCEPTED.includes(file.type)) {
          rejected.push(`${file.name}: format acceptat doar JPG, PNG sau WEBP`);
          continue;
        }
        if (file.size > MAX_FILE_MB * 1024 * 1024) {
          rejected.push(`${file.name}: peste ${MAX_FILE_MB} MB`);
          continue;
        }
        try {
          const dataUrl = await readFile(file);
          const { width, height } = await measure(dataUrl);
          if (width < MIN_DIMENSION || height < MIN_DIMENSION) {
            rejected.push(`${file.name}: rezoluție prea mică (${width}x${height}px, minim ${MIN_DIMENSION}px)`);
            continue;
          }
          accepted.push({
            id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`,
            dataUrl,
            name: file.name,
            sizeKb: Math.round(file.size / 1024),
            width,
            height,
            orientation: width === height ? "square" : width > height ? "landscape" : "portrait",
          });
        } catch {
          rejected.push(`${file.name}: fișierul nu a putut fi citit`);
        }
      }

      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";

      if (accepted.length) {
        onChange([...photos, ...accepted]);
        toast.success(`${accepted.length} ${accepted.length === 1 ? "fotografie adăugată" : "fotografii adăugate"}.`);
      }
      rejected.forEach((msg) => toast.error(msg));
    },
    [maxPhotos, onChange, photos],
  );

  const remove = (id: string) => onChange(photos.filter((p) => p.id !== id));

  const portraitCount = photos.filter((p) => p.orientation === "portrait").length;
  const ready = photos.length >= 3;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-5 text-center">
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={ACCEPTED.join(",")}
          multiple
          className="sr-only"
          onChange={(e) => void handleFiles(e.target.files)}
          aria-label="Încarcă fotografii ale proprietății"
        />
        <ImagePlus className="mx-auto mb-2 h-7 w-7 text-primary" aria-hidden="true" />
        <p className="text-sm font-medium text-foreground">
          Încarcă până la {maxPhotos} fotografii ale proprietății
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          JPG, PNG sau WEBP · maxim {MAX_FILE_MB} MB / poză · minim {MIN_DIMENSION}px pe fiecare latură ·
          recomandat orientare peisaj (landscape)
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-3 min-h-12"
          disabled={busy || photos.length >= maxPhotos}
          onClick={() => inputRef.current?.click()}
          aria-label="Selectează fotografii pentru analiză"
        >
          {busy ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> Se verifică...</>
          ) : (
            <><ImagePlus className="mr-2 h-4 w-4" aria-hidden="true" /> Selectează fotografii</>
          )}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge variant={photos.length ? "default" : "secondary"}>
          {photos.length}/{maxPhotos} fotografii
        </Badge>
        {photos.length > 0 && (
          <Badge variant={ready ? "default" : "secondary"} className="gap-1">
            {ready ? (
              <><CheckCircle2 className="h-3 w-3" aria-hidden="true" /> Set suficient pentru analiză</>
            ) : (
              <><AlertTriangle className="h-3 w-3" aria-hidden="true" /> Adaugă minim 3 poze pentru precizie</>
            )}
          </Badge>
        )}
        {portraitCount > 0 && (
          <Badge variant="outline" className="gap-1">
            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
            {portraitCount} {portraitCount === 1 ? "poză verticală" : "poze verticale"} — peisajul dă rezultate mai bune
          </Badge>
        )}
      </div>

      {photos.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {photos.map((p) => (
            <li key={p.id} className="group relative overflow-hidden rounded-lg border border-border bg-background">
              <img
                src={p.dataUrl}
                alt={`Previzualizare ${p.name}`}
                loading="lazy"
                className="h-28 w-full object-cover"
              />
              <div className="space-y-0.5 p-2">
                <p className="truncate text-[11px] font-medium text-foreground">{p.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {p.width}x{p.height}px · {p.sizeKb} KB ·{" "}
                  {p.orientation === "landscape" ? "peisaj" : p.orientation === "portrait" ? "portret" : "pătrat"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => remove(p.id)}
                className="absolute right-1.5 top-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-background/90 text-destructive shadow transition hover:bg-background"
                aria-label={`Șterge fotografia ${p.name}`}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AnalysisPhotoUploader;
