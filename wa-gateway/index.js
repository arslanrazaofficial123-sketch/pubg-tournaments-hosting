import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { createWorker } from "./core.js";

const require = createRequire(import.meta.url);
const baileys = require("@whiskeysockets/baileys");
const makeWASocket = baileys.default ?? baileys.makeWASocket;
const { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = baileys;
const qrcode = require("qrcode-terminal");
const pino = require("pino");

// settings from .env (API_URL, WA_GATEWAY_SECRET, optional DELAY_MIN_MS / DELAY_MAX_MS)
if (existsSync(".env")) {
  for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
const API_URL = (process.env.API_URL || "").replace(/\/$/, "");
const SECRET = process.env.WA_GATEWAY_SECRET || "";
if (!API_URL || !SECRET) {
  console.error("Set API_URL and WA_GATEWAY_SECRET in the .env file next to this script.");
  process.exit(1);
}

let sock = null;
let connected = false;
let number = "";

async function connect() {
  const { state, saveCreds } = await useMultiFileAuthState("auth");
  const { version } = await fetchLatestBaileysVersion();
  sock = makeWASocket({ version, auth: state, logger: pino({ level: "silent" }), browser: ["Epix Gateway", "Chrome", "1.0"] });
  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("connection.update", ({ connection, lastDisconnect, qr }) => {
    if (qr) { console.log("\nScan this QR with WhatsApp > Linked devices > Link a device:\n"); qrcode.generate(qr, { small: true }); }
    if (connection === "open") { connected = true; number = (sock.user?.id || "").split(":")[0]; console.log(`WhatsApp connected as ${number}`); }
    if (connection === "close") {
      connected = false;
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code === DisconnectReason.loggedOut) { console.log("Logged out from the phone. Delete the 'auth' folder and start again."); process.exit(1); }
      console.log("Connection lost, reconnecting...");
      setTimeout(connect, 2000);
    }
  });
}

async function send(to, text) {
  if (!connected) throw new Error("WhatsApp not connected");
  const check = await sock.onWhatsApp(to);
  const hit = check?.[0];
  if (!hit?.exists) { const e = new Error("Number is not on WhatsApp"); e.permanent = true; throw e; }
  await sock.sendMessage(hit.jid, { text });
}

await connect();
const worker = createWorker({
  apiUrl: API_URL, secret: SECRET, send,
  isConnected: () => connected, myNumber: () => number,
  delay: [Number(process.env.DELAY_MIN_MS) || 1500, Number(process.env.DELAY_MAX_MS) || 3500],
});
console.log("Gateway running. Leave this window open during tournaments.");
worker.loop();
