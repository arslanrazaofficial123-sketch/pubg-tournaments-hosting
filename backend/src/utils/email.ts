import { env } from "../config/env.js";

const RESEND_API_URL = "https://api.resend.com/emails";

interface OrderEmailData {
  id: string;
  packageLabel: string;
  ucAmount: number;
  price: number;
  paymentMethod: string;
  pubgUid: string;
  inGameName: string;
  email?: string;
  whatsapp?: string;
  transactionId?: string;
  createdAt: Date;
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!env.resendApiKey) {
    console.error("RESEND_API_KEY not configured");
    return false;
  }
  try {
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Epix Esports <onboarding@resend.dev>",
        to,
        subject,
        html,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("Resend API error:", res.status, body);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Failed to send email via Resend:", err);
    return false;
  }
}

function toEmailString(email: string | null | undefined): string | undefined {
  return email && email.length > 0 ? email : undefined;
}

export async function sendOrderConfirmationEmail(to: string | null | undefined, order: OrderEmailData): Promise<boolean> {
  const recipient = toEmailString(to);
  if (!recipient) return false;

  const methodLabel = order.paymentMethod === "wallet" ? "Wallet Balance" : "Manual (JazzCash/EasyPaisa/Bank)";
  const statusLabel = order.paymentMethod === "wallet" ? "Processing" : "Pending Verification";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #7c3aed 0%, #ec4899 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Epix Esports</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0;">Order Confirmation</p>
      </div>
      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
        <p style="font-size: 16px;">Hi <strong>${order.inGameName}</strong>,</p>
        <p>Thank you for your order! We've received your purchase and here are the details:</p>
        
        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="margin: 0 0 16px; color: #374151;">Order Summary</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #6b7280;">Order ID</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${order.id}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Package</td><td style="padding: 8px 0; text-align: right;">${order.packageLabel} (${order.ucAmount} UC)</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Amount</td><td style="padding: 8px 0; text-align: right; font-weight: 600; color: #7c3aed;">${order.price.toLocaleString()} PKR</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Payment</td><td style="padding: 8px 0; text-align: right;">${methodLabel}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Status</td><td style="padding: 8px 0; text-align: right;"><span style="background: #fef3c7; color: #92400e; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${statusLabel}</span></td></tr>
            ${order.transactionId ? `<tr><td style="padding: 8px 0; color: #6b7280;">Txn ID</td><td style="padding: 8px 0; text-align: right; font-family: monospace; font-size: 12px;">${order.transactionId}</td></tr>` : ""}
            ${order.whatsapp ? `<tr><td style="padding: 8px 0; color: #6b7280;">WhatsApp</td><td style="padding: 8px 0; text-align: right; font-size: 12px;">${order.whatsapp}</td></tr>` : ""}
          </table>
        </div>

        <p style="color: #6b7280; font-size: 14px;">
          ${order.paymentMethod === "wallet" 
            ? "Your UC will be topped up shortly. You'll receive another email when it's completed."
            : "Our team will verify your payment and process the UC top-up within 30 minutes during business hours."
          }
        </p>

        <p style="color: #6b7280; font-size: 14px;">
          If you have any questions, contact us at <a href="mailto:${env.alertEmail}" style="color: #7c3aed;">${env.alertEmail}</a> 
          or WhatsApp <a href="https://wa.me/923155782629" style="color: #7c3aed;">+92 315 578 2629</a>.
        </p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
          Epix Esports &bull; Kallar Syedan, Rawalpindi, Pakistan
        </p>
      </div>
    </body>
    </html>
  `;

  return sendEmail(recipient, `Order Confirmation - ${order.packageLabel} (${order.ucAmount} UC)`, html);
}

export async function sendAdminOrderNotificationEmail(order: OrderEmailData): Promise<boolean> {
  const adminEmail = env.alertEmail;
  if (!adminEmail) return false;

  const methodLabel = order.paymentMethod === "wallet" ? "Wallet Balance" : "Manual (JazzCash/EasyPaisa/Bank)";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #dc2626 0%, #ea580c 100%); padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 20px;">New Shop Order</h1>
      </div>
      <div style="background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
          <p style="margin: 0 0 8px;"><strong>Order ID:</strong> ${order.id}</p>
          <p style="margin: 0 0 8px;"><strong>Package:</strong> ${order.packageLabel} (${order.ucAmount} UC)</p>
          <p style="margin: 0 0 8px;"><strong>Amount:</strong> ${order.price.toLocaleString()} PKR</p>
          <p style="margin: 0 0 8px;"><strong>Payment:</strong> ${methodLabel}</p>
          <p style="margin: 0 0 8px;"><strong>PUBG UID:</strong> ${order.pubgUid}</p>
          <p style="margin: 0 0 8px;"><strong>In-Game Name:</strong> ${order.inGameName}</p>
          ${order.email ? `<p style="margin: 0 0 8px;"><strong>Email:</strong> ${order.email}</p>` : ""}
          ${order.whatsapp ? `<p style="margin: 0 0 8px;"><strong>WhatsApp:</strong> ${order.whatsapp}</p>` : ""}
          <p style="margin: 0;"><strong>Time:</strong> ${order.createdAt.toLocaleString("en-PK", { timeZone: "Asia/Karachi" })}</p>
          ${order.transactionId ? `<p style="margin: 8px 0 0;"><strong>Txn ID:</strong> ${order.transactionId}</p>` : ""}
        </div>
        <p style="font-size: 14px; color: #6b7280;">
          ${order.paymentMethod === "wallet" 
            ? "Wallet payment - auto-deduct and process UC top-up."
            : "Manual payment - verify receipt in admin panel before processing."
          }
        </p>
        <div style="text-align: center; margin-top: 20px;">
          <a href="${env.clientUrl}/admin" style="display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Open Admin Panel</a>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(adminEmail, `New Shop Order - ${order.packageLabel} (${order.ucAmount} UC)`, html);
}
