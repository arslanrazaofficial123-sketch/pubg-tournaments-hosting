import { env } from "../config/env.js";

export interface UploadImageParams {
  kind: "avatar" | "team-logo" | "player-picture" | "wallet-proof";
  uid?: string;
  teamName?: string;
  dataUrl: string;
}

export async function uploadImage(params: UploadImageParams): Promise<string> {
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
}