import express from "express";
import { mkdir, writeFile } from "node:fs/promises";
import { join, extname, normalize } from "node:path";

const ROOT = "D:\\epix-data\\files";
const PORT = 8081;
const TOKEN = process.env.FILES_TOKEN || "epix-local-files-token";

const app = express();
app.use(express.json({ limit: "10mb" }));

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
  const match = String(dataUrl).match(/^data:image\/(png|jpe?g|webp);base64,(.+)$/);
  if (!match) return null;
  const ext = match[1] === "jpeg" ? "jpg" : match[1];
  return { ext, buffer: Buffer.from(match[2], "base64") };
}

app.post("/api/upload", requireToken, async (req, res) => {
  try {
    const { kind, uid, teamName, dataUrl } = req.body || {};
    const parsed = parseDataUrl(dataUrl);
    if (!parsed) {
      return res.status(400).json({ message: "Valid image data URL required (png, jpg, webp)." });
    }

    let relDir;
    let fileName;
    if (kind === "avatar") {
      relDir = join("avatars");
      fileName = `${safeName(uid || "anon")}.${parsed.ext}`;
    } else if (kind === "team-logo") {
      relDir = join("teams", safeName(teamName || "team"));
      fileName = `logo.${parsed.ext}`;
    } else if (kind === "player-picture") {
      relDir = join("teams", safeName(teamName || "team"), "players");
      fileName = `${safeName(uid || "player")}.${parsed.ext}`;
    } else {
      return res.status(400).json({ message: "Unknown kind" });
    }

    const absDir = join(ROOT, relDir);
    await mkdir(absDir, { recursive: true });
    const absPath = join(absDir, fileName);
    await writeFile(absPath, parsed.buffer);

    const urlPath = normalize(join("/files", relDir, fileName)).replace(/\\/g, "/");
    res.json({ url: urlPath });
  } catch (err) {
    console.error("upload failed:", err);
    res.status(500).json({ message: "Storage failed" });
  }
});

app.use("/files", express.static(ROOT));

app.listen(PORT, () => console.log(`epix file server listening on :${PORT} root=${ROOT}`));