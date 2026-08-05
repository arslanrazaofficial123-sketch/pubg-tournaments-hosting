import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.PORT) || 5000,
  mongoUri:
    process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/pubg-tournaments",
  clientUrl: process.env.CLIENT_URL || "http://localhost:3000",
  nodeEnv: process.env.NODE_ENV || "development",
  adminPassword: process.env.ADMIN_PASSWORD || "admin123",
  partnerPassword: process.env.PARTNER_PASSWORD || "partner123",
  jwtSecret: process.env.JWT_SECRET || "pubg_super_secret_key_123_456_789",
  smtpHost: process.env.SMTP_HOST || "smtp.gmail.com",
  smtpPort: Number(process.env.SMTP_PORT) || 465,
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  alertEmail: process.env.ALERT_EMAIL || "",
};
