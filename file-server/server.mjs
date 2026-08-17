import express from "express";
import { mkdir, writeFile } from "node:fs/promises";
import { join, normalize } from "node:path";
import sharp from "sharp";

const ROOT = "D:\\epix-data\\files";
const PORT = 8081;
const TOKEN = process.env.FILES_TOKEN || "epix-local-files-token";

const app = express();
app.use(express.json({ limit: "40mb" }));

function requireToken(req, res, next) {
  if (req.headers["x-files-token"] !== TOKEN) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

function safeName(value) {
  return String(value).replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
}

function parseDataUrl(dataUrl) {
  const match = String(dataUrl).match(/^data:image\/[a-z0-9.+-]+;base64,(.+)$/i);
  if (!match) return null;
  return { buffer: Buffer.from(match[1], "base64") };
}

app.post("/api/upload", requireToken, async (req, res) => {
  try {
    const { kind, uid, teamName, dataUrl } = req.body || {};
    const parsed = parseDataUrl(dataUrl);
    if (!parsed) {
      return res.status(400).json({ message: "Valid image data URL required." });
    }

    // Convert any image format to PNG before storing.
    let pngBuffer;
    try {
      pngBuffer = await sharp(parsed.buffer).png().toBuffer();
    } catch {
      return res.status(400).json({ message: "Unsupported or invalid image file." });
    }

    let relDir;
    let fileName;
    if (kind === "avatar") {
      relDir = join("avatars");
      fileName = `${safeName(uid || "anon")}.png`;
    } else if (kind === "team-logo") {
      relDir = join("teams", safeName(teamName || "team"));
      fileName = `logo.png`;
    } else if (kind === "player-picture") {
      relDir = join("teams", safeName(teamName || "team"), "players");
      fileName = `${safeName(uid || "player")}.png`;
    } else if (kind === "wallet-proof") {
      relDir = join("wallets", safeName(uid || "user"));
      fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
    } else {
      return res.status(400).json({ message: "Unknown kind" });
    }

    const absDir = join(ROOT, relDir);
    await mkdir(absDir, { recursive: true });
    const absPath = join(absDir, fileName);
    await writeFile(absPath, pngBuffer);

    const urlPath = normalize(join("/files", relDir, fileName)).replace(/\\/g, "/");
    res.json({ url: urlPath });
  } catch (err) {
    console.error("upload failed:", err);
    res.status(500).json({ message: "Storage failed" });
  }
});

app.use("/files", express.static(ROOT));

app.listen(PORT, () => console.log(`epix file server listening on :${PORT} root=${ROOT}`));