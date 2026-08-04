import crypto from "crypto";
import { env } from "../config/env.js";

const JWT_SECRET = env.jwtSecret;

export function signToken(payload: Record<string, any>, expiresInHours = 24): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  
  const exp = Math.floor(Date.now() / 1000) + expiresInHours * 60 * 60;
  const body = Buffer.from(JSON.stringify({ ...payload, exp })).toString("base64url");
  
  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${header}.${body}`)
    .digest("base64url");
    
  return `${header}.${body}.${signature}`;
}

export function verifyToken(token: string): Record<string, any> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    
    const [header, body, signature] = parts;
    const expectedSignature = crypto
      .createHmac("sha256", JWT_SECRET)
      .update(`${header}.${body}`)
      .digest("base64url");
      
    if (signature !== expectedSignature) return null;
    
    const decoded = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    
    // Check expiration
    if (decoded.exp && Math.floor(Date.now() / 1000) > decoded.exp) {
      return null;
    }
    
    return decoded;
  } catch {
    return null;
  }
}
