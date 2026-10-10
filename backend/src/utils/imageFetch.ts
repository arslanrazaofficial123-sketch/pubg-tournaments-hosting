export function sanitizePathSegment(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80) || "team";
}

export function extFromUrlOrType(url: string, contentType: null | string): string {
  const fromCt = (contentType || "").split(";")[0].trim();
  const ctMap: Record<string, string> = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/svg+xml": ".svg",
  };
  if (fromCt && ctMap[fromCt]) return ctMap[fromCt];
  try {
    const pathname = new URL(url).pathname;
    const m = pathname.match(/\.(png|jpe?g|webp|gif|svg)$/i);
    if (m) return m[1].toLowerCase() === "jpeg" ? ".jpg" : m[1].toLowerCase();
  } catch {
    /* ignore */
  }
  return ".png";
}

export async function fetchImageBuffer(
  url: string,
): Promise<{ buffer: Buffer; ext: string } | null> {
  if (!url || !/^https?:\/\//i.test(url)) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return { buffer: buf, ext: extFromUrlOrType(url, res.headers.get("content-type")) };
  } catch {
    return null;
  }
}
