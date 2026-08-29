import { env } from "../config/env.js";

const GRAPH_API_URL = "https://graph.facebook.com/v18.0";

function formatPhoneForWhatsApp(phone: string): string {
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

  return [
    `🎮 *${teamName} — MATCH IS LIVE!*`,
    ``,
    `Dear ${teamName},`,
    `Your match credentials for *${data.tournamentTitle} (${data.map})* are now live:`,
    ``,
    `🔹 *Room ID:* ${data.roomId}`,
    `🔹 *Password:* ${data.roomPassword}`,
    `🔹 *Time:* ${dateFormatted} PKT`,
    ``,
    `Join your assigned slot on time.`,
    `Wrong slot joining or misbehavior will lead to kick/ban.`,
    ``,
    `Good Luck & Have Fun! 🏆`,
  ].join("\n");
}

export async function sendWhatsAppMessage(to: string, message: string): Promise<boolean> {
  if (!env.whatsappApiToken || !env.whatsappPhoneNumberId) {
    console.error("WhatsApp API not configured (WHATSAPP_API_TOKEN or WHATSAPP_PHONE_NUMBER_ID missing)");
    return false;
  }

  const phone = formatPhoneForWhatsApp(to);

  try {
    const res = await fetch(`${GRAPH_API_URL}/${env.whatsappPhoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.whatsappApiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone,
        type: "text",
        text: { body: message },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("WhatsApp API error:", res.status, body);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Failed to send WhatsApp message:", err);
    return false;
  }
}

export async function sendMatchCredentialsWhatsApp(
  registrations: MatchCredentialsPayload[],
): Promise<{ sent: number; failed: number; total: number }> {
  let sent = 0;
  let failed = 0;

  for (const reg of registrations) {
    if (!reg.whatsappNumber) {
      failed++;
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
    });

    const ok = await sendWhatsAppMessage(reg.whatsappNumber, message);
    if (ok) sent++;
    else failed++;
  }

  return { sent, failed, total: registrations.length };
}
