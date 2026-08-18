import nodemailer from "nodemailer";
import { env } from "../config/env.js";

const transporter = nodemailer.createTransport({
  host: env.smtpHost,
  port: env.smtpPort,
  secure: env.smtpPort === 465,
  auth: {
    user: env.smtpUser,
    pass: env.smtpPass,
  },
});

export interface ContactMessageInput {
  name: string;
  contact: string;
  topic: string;
  message: string;
}

export async function sendContactAlert(data: ContactMessageInput): Promise<void> {
  const subject = `New Contact Message - ${data.topic}`;
  const body = [
    "A new message was submitted from the EPIX Esports contact page:",
    "",
    `Name: ${data.name}`,
    `Contact: ${data.contact}`,
    `Topic: ${data.topic}`,
    "",
    "Message:",
    data.message,
    "",
    "Reply to the visitor using the contact details above.",
  ].join("\n");

  await transporter.sendMail({
    from: `"EPIX Esports" <${env.smtpUser}>`,
    to: env.alertEmail,
    subject,
    text: body,
  });
}

export interface ErrorAlertInput {
  source: string;
  message: string;
  stack?: string;
  url?: string;
  method?: string;
  statusCode?: number;
  timestamp?: string;
}

function humanReadableError(data: ErrorAlertInput): string {
  const msg = data.message || "Unknown error";

  if (msg.includes("request aborted")) {
    return "A user sent a request that was too large or took too long. The server dropped it before finishing. Likely a big image upload that timed out.";
  }
  if (msg.includes("E11000 duplicate key")) {
    const match = msg.match(/index: (\w+)/);
    const field = match ? match[1].replace(/_1$/, "") : "a field";
    return `Two users tried to use the same ${field} value. The system rejected the duplicate.`;
  }
  if (msg.includes("TOURNAMENT_NOT_FOUND")) {
    return "Someone tried to register for a tournament that no longer exists or has been deleted.";
  }
  if (msg.includes("TEAM_NAME_ALREADY_EXISTS")) {
    return "A team tried to register with a name that is already taken in this tournament.";
  }
  if (msg.includes("GROUP_FULL")) {
    return "The selected tournament group is already full. No more teams can join it.";
  }
  if (msg.includes("TOURNAMENT_FULL")) {
    return "The tournament has reached its maximum capacity. No more registrations accepted.";
  }
  if (msg.includes("Insufficient wallet balance")) {
    return "A user tried to pay with their wallet but didn't have enough balance.";
  }
  if (msg.includes("FILE_STORE_FAILED")) {
    return "Failed to save an uploaded image. The file storage service may be down.";
  }
  if (msg.includes("MONGO_NETWORK_ERROR") || msg.includes("ECONNREFUSED")) {
    return "Cannot connect to the database. MongoDB might be down or unreachable.";
  }
  if (msg.includes("JWT") || msg.includes("token")) {
    return "Authentication failed. A user submitted an invalid or expired login token.";
  }
  if (data.source?.includes("Unhandled Rejection") || data.source?.includes("Uncaught Exception")) {
    return `Something crashed unexpectedly in the backend. ${msg}`;
  }
  return msg;
}

export async function sendErrorAlert(data: ErrorAlertInput): Promise<void> {
  const simple = humanReadableError(data);
  const subject = `[EPIX] ${data.source}`;
  const body = [
    `What happened: ${simple}`,
    "",
    `Where: ${data.url || "server process"} ${data.method || ""} ${data.statusCode ? `(HTTP ${data.statusCode})` : ""}`.trim(),
    `When: ${data.timestamp || new Date().toISOString()}`,
    "",
    "No action needed unless this keeps happening.",
  ].join("\n");

  await transporter.sendMail({
    from: `"EPIX Esports Alerts" <${env.smtpUser}>`,
    to: env.alertEmail,
    subject,
    text: body,
  });
}
