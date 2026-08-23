import fs from "fs";
import path from "path";
import { env } from "../config/env.js";

const LOCAL_IMAGE_DIR = "D:\\epix-images";

export interface UploadImageParams {
  kind: "avatar" | "team-logo" | "player-picture" | "wallet-proof";
  uid?: string;
  teamName?: string;
  dataUrl: string;
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
}

function dataUrlToBuffer(dataUrl: string): { buffer: Buffer; ext: string } {
  const match = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!match) throw new Error("Invalid data URL");
  const ext = match[1] === "jpeg" ? "jpg" : match[1];
  return { buffer: Buffer.from(match[2], "base64"), ext };
}

function saveLocally(subdir: string, filename: string, dataUrl: string): string {
  const dir = path.join(LOCAL_IMAGE_DIR, subdir);
  ensureDir(dir);
  const { buffer, ext } = dataUrlToBuffer(dataUrl);
  const safeName = sanitizeFilename(filename) + "." + ext;
  const filePath = path.join(dir, safeName);
  fs.writeFileSync(filePath, buffer);
  return `/images/${subdir}/${safeName}`;
}

export async function uploadImage(params: UploadImageParams): Promise<string> {
  const { kind, uid, teamName, dataUrl } = params;

  if (kind === "team-logo") {
    const name = sanitizeFilename(teamName || uid || "logo");
    return saveLocally("team-logos", name, dataUrl);
  }

  if (kind === "player-picture") {
    const name = sanitizeFilename(uid || "player");
    return saveLocally("player-pictures", name, dataUrl);
  }

  if (kind === "avatar") {
    const name = sanitizeFilename(uid || "avatar");
    return saveLocally("avatars", name, dataUrl);
  }

  if (kind === "wallet-proof") {
    const name = sanitizeFilename(uid || "proof") + "-" + Date.now();
    return saveLocally("wallet-proofs", name, dataUrl);
  }

  try {
    const response = await fetch(`${env.filesBaseUrl}/api/upload`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-files-token": env.filesToken,
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error("FILE_STORE_FAILED");
    }

    const body = (await response.json()) as { url: string };
    return `${env.filesBaseUrl}${body.url}`;
  } catch {
    const name = sanitizeFilename(uid || kind);
    return saveLocally("misc", name, dataUrl);
  }
}