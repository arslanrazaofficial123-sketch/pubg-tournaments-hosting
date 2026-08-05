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

export async function sendErrorAlert(data: ErrorAlertInput): Promise<void> {
  const subject = `[EPIX ERROR] ${data.source} - ${(data.message || "Unknown error").slice(0, 120)}`;
  const body = [
    "An error was reported on the EPIX Esports platform.",
    "",
    `Source: ${data.source}`,
    `Time: ${data.timestamp || new Date().toISOString()}`,
    `URL: ${data.url || "-"}`,
    `Method: ${data.method || "-"}`,
    data.statusCode ? `HTTP Status: ${data.statusCode}` : "",
    "",
    "Message:",
    data.message,
    "",
    data.stack ? "Stack trace:" : "",
    data.stack || "",
    "",
    "This alert was generated automatically. If it repeats, review the service logs.",
  ]
    .filter((line) => line !== "")
    .join("\n");

  await transporter.sendMail({
    from: `"EPIX Esports Alerts" <${env.smtpUser}>`,
    to: env.alertEmail,
    subject,
    text: body,
  });
}
