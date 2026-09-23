import { v2 as cloudinary } from "cloudinary";
import { env } from "../config/env.js";

cloudinary.config({
  cloud_name: env.cloudinaryCloudName,
  api_key: env.cloudinaryApiKey,
  api_secret: env.cloudinaryApiSecret,
});

export interface UploadImageParams {
  kind: "avatar" | "team-logo" | "player-picture" | "wallet-proof" | "receipt";
  uid?: string;
  teamName?: string;
  dataUrl: string;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
}

const FOLDER_MAP: Record<string, string> = {
  avatar: "epix/avatars",
  "team-logo": "epix/team-logos",
  "player-picture": "epix/player-pictures",
  "wallet-proof": "epix/wallet-proofs",
  receipt: "epix/receipts",
};

export async function uploadImage(params: UploadImageParams): Promise<string> {
  const { kind, uid, teamName, dataUrl } = params;

  const match = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!match) throw new Error("Invalid data URL");

  const folder = FOLDER_MAP[kind] || "epix/misc";
  const baseName = sanitizeFilename(
    kind === "team-logo" ? teamName || uid || "logo"
    : kind === "wallet-proof" ? `${uid || "proof"}-${Date.now()}`
    : uid || kind
  );

  const result = await cloudinary.uploader.upload(dataUrl, {
    folder,
    public_id: baseName,
    overwrite: true,
    resource_type: "image",
  });

  return result.secure_url;
}
