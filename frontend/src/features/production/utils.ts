const PKT_OFFSET_MS = 5 * 60 * 60 * 1000; // Pakistan time is UTC+5 all year

export function formatBytes(bytes: number): string {
  if (!bytes) return "0 MB";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function plural(n: number, word: string, many = `${word}s`): string {
  return `${n} ${n === 1 ? word : many}`;
}

/** ISO → "Oct 14, 2026, 9:00 PM" in Pakistan time. */
export function formatPkt(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "Asia/Karachi",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** ISO → value for <input type="datetime-local"> expressed in Pakistan time. */
export function isoToPktInput(iso: string | null): string {
  if (!iso) return "";
  return new Date(new Date(iso).getTime() + PKT_OFFSET_MS).toISOString().slice(0, 16);
}

/** <input type="datetime-local"> value (Pakistan time) → ISO string. */
export function pktInputToIso(value: string): string | null {
  if (!value) return null;
  const d = new Date(`${value}:00+05:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function timeLeft(iso: string | null): string {
  if (!iso) return "";
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "Deadline passed";
  const mins = Math.floor(ms / 60000);
  const days = Math.floor(mins / 1440);
  const hours = Math.floor((mins % 1440) / 60);
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${mins % 60}m left`;
  return `${mins}m left`;
}

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(blob);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("unsupported"));
    img.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), type, quality);
  });
}

/**
 * Reads an image file as a data URL, shrinking big files so a whole team fits in one upload.
 * Small files are sent untouched. PNG/WebP keep transparency (important for logos and cut-outs).
 */
export async function prepareImage(
  file: File,
  opts: { maxDim: number; keepUnder: number },
): Promise<string> {
  const okTypes = ["image/png", "image/jpeg", "image/webp"];
  if (okTypes.includes(file.type) && file.size <= opts.keepUnder) {
    return readAsDataUrl(file);
  }
  const original = await readAsDataUrl(file);
  let img: HTMLImageElement;
  try {
    img = await loadImage(original);
  } catch {
    throw new Error(`"${file.name}" is not a supported image. Use PNG, JPG or WebP.`);
  }
  const scale = Math.min(1, opts.maxDim / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return original;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const transparent = file.type === "image/png" || file.type === "image/webp";
  let blob: Blob;
  if (transparent) {
    blob = await canvasToBlob(canvas, "image/png");
    if (blob.size > opts.keepUnder * 2) blob = await canvasToBlob(canvas, "image/webp", 0.9);
  } else {
    blob = await canvasToBlob(canvas, "image/jpeg", 0.88);
  }
  return readAsDataUrl(blob);
}

export const LOGO_OPTS = { maxDim: 1024, keepUnder: 700 * 1024 };
export const PHOTO_OPTS = { maxDim: 1280, keepUnder: 400 * 1024 };
/** Keep each request under the hosting limit (~4.5 MB). */
export const MAX_PAYLOAD_CHARS = 4_200_000;
