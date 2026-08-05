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
