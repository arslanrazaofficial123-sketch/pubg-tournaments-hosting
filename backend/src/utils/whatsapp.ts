import { env } from "../config/env.js";
import { WaMessageModel } from "../models/WaMessage.js";

const BLUETICKS_API_URL = "https://api.blueticks.co/v1";

function formatPhone(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, "");
  if (digits.startsWith("92")) return digits;
  if (digits.startsWith("0")) return "92" + digits.substring(1);
  return digits;
}

export interface MatchCredentialsPayload {
  teamName: string;
  whatsappNumber: string;
  tournamentTitle: string;
  matchTitle: string;
  map: string;
  roomId: string;
  roomPassword: string;
  matchTime: string;
  matchDate: string;
  slotNumber?: number | null;
  group?: string;
  matchId?: string;
}

export function buildMatchCredentialsMessage(teamName: string, data: Omit<MatchCredentialsPayload, "teamName" | "whatsappNumber">): string {
  const dateFormatted = new Date(`${data.matchDate}T${data.matchTime || "20:00"}`).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Karachi",
  });

  const slotLine = data.slotNumber != null ? `🔹 *Slot:* #${data.slotNumber} (${data.group || ""})\n` : "";
  const groupLine = data.slotNumber == null && data.group ? `🔹 *Group:* ${data.group}\n` : "";

  return [
    `🎮 *${teamName} — MATCH IS LIVE!*`,
    ``,
    `Dear ${teamName},`,
    `Your match credentials for *${data.tournamentTitle} (${data.map})* are now live:`,
    ``,
    `${slotLine}${groupLine}🔹 *Room ID:* ${data.roomId}`,
    `🔹 *Password:* ${data.roomPassword}`,
    `🔹 *Time:* ${dateFormatted} PKT`,
    ``,
    `Join your assigned slot on time.`,
    `Wrong slot joining or misbehavior will lead to kick/ban.`,
    ``,
    `Good Luck & Have Fun! 🏆`,
  ].join("\n");
}

export function buildWhatsAppLink(phone: string, message: string): string {
  const phoneFormatted = formatPhone(phone);
  return `https://wa.me/${phoneFormatted}?text=${encodeURIComponent(message)}`;
}

async function sendViaBlueticks(to: string, message: string): Promise<boolean> {
  if (!env.whatsappApiKey) return false;

  const phone = formatPhone(to);

  try {
    const res = await fetch(`${BLUETICKS_API_URL}/messages/${phone}@c.us`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.whatsappApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "text",
        text: message,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("Blueticks API error:", res.status, body);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Failed to send via Blueticks:", err);
    return false;
  }
}

export interface SendResult {
  sent: number;
  failed: number;
  noNumber: number;
  total: number;
  waLinks: Array<{ teamName: string; phone: string; link: string }>;
  /* one line per team, so the admin can see exactly who got it and who did not */
  results: Array<{ teamName: string; phone: string; slotNumber?: number | null; status: "sent" | "queued" | "link" | "no-number" }>;
}

export async function sendMatchCredentialsWhatsApp(
  registrations: MatchCredentialsPayload[],
): Promise<SendResult> {
  let sent = 0;
  let failed = 0;
  let noNumber = 0;
  const waLinks: Array<{ teamName: string; phone: string; link: string }> = [];
  const results: SendResult["results"] = [];
  const toQueue: Array<{ to: string; text: string; teamName: string; matchId: string }> = [];

  for (const reg of registrations) {
    if (!reg.whatsappNumber) {
      noNumber++;
      results.push({ teamName: reg.teamName, phone: "", slotNumber: reg.slotNumber ?? null, status: "no-number" });
      continue;
    }

    const message = buildMatchCredentialsMessage(reg.teamName, {
      tournamentTitle: reg.tournamentTitle,
      matchTitle: reg.matchTitle,
      map: reg.map,
      roomId: reg.roomId,
      roomPassword: reg.roomPassword,
      matchTime: reg.matchTime,
      matchDate: reg.matchDate,
      slotNumber: reg.slotNumber ?? null,
      group: reg.group,
    });

    let ok = false;
    let queued = false;
    if (env.waGatewaySecret) {
      /* free route: the gateway on the organiser's PC sends it from his own WhatsApp */
      toQueue.push({ to: formatPhone(reg.whatsappNumber), text: message, teamName: reg.teamName, matchId: reg.matchId || "" });
      ok = true;
      queued = true;
    } else if (env.whatsappApiKey) {
      ok = await sendViaBlueticks(reg.whatsappNumber, message);
    }

    if (!ok) {
      waLinks.push({
        teamName: reg.teamName,
        phone: reg.whatsappNumber,
        link: buildWhatsAppLink(reg.whatsappNumber, message),
      });
    }

    if (ok) sent++;
    else failed++;
    results.push({
      teamName: reg.teamName,
      phone: reg.whatsappNumber,
      slotNumber: reg.slotNumber ?? null,
      status: queued ? "queued" : ok ? "sent" : "link",
    });
  }

  /* one single insert for every team, so all messages are queued at the same instant */
  if (toQueue.length > 0) {
    try {
      await WaMessageModel.insertMany(toQueue, { ordered: false });
    } catch (err) {
      console.error("Failed to queue WhatsApp messages:", err);
      sent = 0;
      failed += toQueue.length;
      for (const r of results) if (r.status === "queued") r.status = "link";
    }
  }

  return { sent, failed, noNumber, total: registrations.length, waLinks, results };
}
