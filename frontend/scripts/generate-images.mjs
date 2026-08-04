import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dir = path.join(__dirname, "..", "public", "tournaments");
fs.mkdirSync(dir, { recursive: true });

const tournaments = [
  { card: "pmwc-spring", modal: "pmwc-spring", title: "PMWC Spring" },
  { card: "pmpl-weekly", modal: "pmpl-weekly", title: "PMPL Weekly" },
  { card: "community-cup", modal: "community-cup", title: "Community Cup" },
  { card: "pmpl-live", modal: "pmpl-live", title: "PMPL Live" },
  { card: "scrim-masters", modal: "scrim-masters", title: "Scrim Masters" },
  { card: "pmco-finals", modal: "pmco-finals", title: "PMCO Finals" },
  { card: "pmpl-ended", modal: "pmpl-ended", title: "PMPL Weekly" },
  { card: "spring-invite", modal: "spring-invite", title: "Spring Invite" },
  { card: "rookie-league", modal: "rookie-league", title: "Rookie League" },
];

function createSvg(width, height, title, isModal) {
  const fontSize = isModal ? 48 : 28;
  const subSize = isModal ? 20 : 14;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#04182d"/>
      <stop offset="100%" style="stop-color:#090f10"/>
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#1faee9;stop-opacity:0.3"/>
      <stop offset="100%" style="stop-color:#1faee9;stop-opacity:0"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <rect width="${width}" height="${height}" fill="url(#accent)"/>
  <circle cx="${width * 0.85}" cy="${height * 0.2}" r="${isModal ? 120 : 60}" fill="#1faee9" opacity="0.08"/>
  <circle cx="${width * 0.1}" cy="${height * 0.85}" r="${isModal ? 80 : 40}" fill="#1faee9" opacity="0.06"/>
  <text x="${isModal ? 40 : 20}" y="${isModal ? height / 2 + 10 : height / 2 + 5}" fill="#f4f6f6" font-family="Arial,sans-serif" font-size="${fontSize}" font-weight="700">${title}</text>
  <text x="${isModal ? 40 : 20}" y="${isModal ? height / 2 + 50 : height / 2 + 28}" fill="#f4f6f6" opacity="0.5" font-family="Arial,sans-serif" font-size="${subSize}">PUBG Mobile Tournament</text>
</svg>`;
}

for (const t of tournaments) {
  fs.writeFileSync(
    path.join(dir, `${t.card}-card.svg`),
    createSvg(640, 360, t.title, false),
  );
  fs.writeFileSync(
    path.join(dir, `${t.modal}-modal.svg`),
    createSvg(1280, 720, t.title, true),
  );
}

console.log("Generated tournament images.");
