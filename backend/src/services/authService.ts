import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import { UserModel } from "../models/User.js";
import { lookupPlayerByUid } from "./playerLookupService.js";
import type {
  LoginPayload,
  RegisterPayload,
  UserProfile,
} from "../types/user.js";
import { env } from "../config/env.js";

const SALT_ROUNDS = 10;

const googleClient = new OAuth2Client(env.googleClientId || undefined);

function toUserProfile(doc: any): UserProfile {
  return {
    uid: doc.uid,
    inGameName: doc.inGameName || "",
    whatsapp: doc.whatsapp || "",
    email: doc.email || undefined,
    name: doc.name || undefined,
    googleId: doc.googleId || undefined,
    avatar: doc.avatar || undefined,
    bio: doc.bio || undefined,
  };
}

export async function findOrCreateUser(uid: string, inGameName?: string): Promise<UserProfile> {
  const existing = await UserModel.findOne({ uid: uid.trim() });
  if (existing) {
    if (inGameName && inGameName.trim() !== "" && (!existing.inGameName || existing.inGameName.trim() === "")) {
      existing.inGameName = inGameName.trim();
      await existing.save();
    }
    return toUserProfile(existing);
  }
  const created = await UserModel.create({
    uid: uid.trim(),
    inGameName: inGameName ? inGameName.trim() : undefined,
  });
  return toUserProfile(created);
}

export async function isUidAvailable(uid: string): Promise<boolean> {
  const existing = await UserModel.findOne({ uid }).lean();
  return !existing;
}

export async function registerUser(
  payload: RegisterPayload,
): Promise<UserProfile> {
  const uidTaken = !(await isUidAvailable(payload.uid));
  if (uidTaken) {
    throw new Error("UID_ALREADY_EXISTS");
  }

  // Validate UID against PUBG/Midasbuy (advisory only — fail-open due to API unreliability from Render)
  const lookup = await lookupPlayerByUid(payload.uid.trim());
  if (!lookup.found) {
    console.warn(`Midasbuy lookup: UID ${payload.uid.trim()} not found (error: ${lookup.error}), allowing registration (fail-open)`);
  } else if (lookup.error === "lookup_failed") {
    console.warn(`Midasbuy lookup failed for UID ${payload.uid.trim()}, allowing registration (fail-open)`);
  }

  const existingWhatsapp = await UserModel.findOne({ whatsapp: payload.whatsapp.trim() }).lean();
  if (existingWhatsapp) {
    throw new Error("WHATSAPP_ALREADY_EXISTS");
  }

  const existingInGameName = await UserModel.findOne({ inGameName: payload.inGameName.trim() }).lean();
  if (existingInGameName) {
    throw new Error("INGAMENAME_ALREADY_EXISTS");
  }

  // Optionally verify inGameName matches Midasbuy (case-insensitive)
  const midasbuyName = lookup.inGameName?.toLowerCase().trim();
  const providedName = payload.inGameName.trim().toLowerCase();
  if (midasbuyName && providedName !== midasbuyName) {
    throw new Error("INGAMENAME_MISMATCH");
  }

  const passwordHash = await bcrypt.hash(payload.password, SALT_ROUNDS);
  const recoveryHash = await bcrypt.hash(payload.recoveryPassword, SALT_ROUNDS);

  const doc = await UserModel.create({
    uid: payload.uid.trim(),
    inGameName: payload.inGameName.trim(),
    whatsapp: payload.whatsapp.trim(),
    password: passwordHash,
    recoveryPassword: recoveryHash,
  });

  return toUserProfile(doc);
}

export async function loginUser(
  payload: LoginPayload,
): Promise<UserProfile | null> {
  const doc = await UserModel.findOne({ uid: payload.uid.trim() });
  if (!doc || !doc.password) return null;

  const isValid = await bcrypt.compare(payload.password, doc.password);
  if (!isValid) return null;

  return toUserProfile(doc);
}

export async function findUserByUid(uid: string): Promise<UserProfile | null> {
  const doc = await UserModel.findOne({ uid }).lean();
  return doc ? toUserProfile(doc) : null;
}

export async function deleteUserByUid(uid: string): Promise<boolean> {
  const result = await UserModel.deleteOne({ uid });
  return result.deletedCount > 0;
}

export async function getAllUsers(): Promise<UserProfile[]> {
  const docs = await UserModel.find({}).lean();
  return docs.map((doc) => toUserProfile(doc));
}

export async function googleSignIn(credential: string): Promise<UserProfile> {
  if (!env.googleClientId) {
    throw new Error("GOOGLE_NOT_CONFIGURED");
  }

  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: env.googleClientId,
  });
  const payload = ticket.getPayload();
  if (!payload || !payload.sub || !payload.email) {
    throw new Error("GOOGLE_INVALID_TOKEN");
  }
  if (payload.email_verified !== true) {
    throw new Error("GOOGLE_EMAIL_NOT_VERIFIED");
  }

  const googleId = payload.sub;
  const email = payload.email.toLowerCase();
  const name = payload.name || "";

  const existing = await UserModel.findOne({
    $or: [{ googleId }, { email }],
  });

  if (existing) {
    if (!existing.googleId) {
      existing.googleId = googleId;
    }
    if (!existing.email) {
      existing.email = email;
    }
    if (name && !existing.name) {
      existing.name = name;
    }
    await existing.save();
    return toUserProfile(existing);
  }

  const created = await UserModel.create({
    uid: `g-${googleId}`,
    googleId,
    email,
    name,
    inGameName: name || undefined,
  });
  return toUserProfile(created);
}

export async function linkUidToUser(currentUid: string, newUid: string): Promise<UserProfile | null> {
  const doc = await UserModel.findOne({ uid: currentUid });
  if (!doc) return null;

  const taken = await UserModel.findOne({
    uid: newUid.trim(),
    _id: { $ne: doc._id },
  }).lean();
  if (taken) {
    throw new Error("UID_ALREADY_LINKED");
  }

  doc.uid = newUid.trim();
  await doc.save();
  return toUserProfile(doc);
}

export async function updateUserProfile(
  uid: string,
  patch: { inGameName?: string; whatsapp?: string; bio?: string; avatar?: string },
): Promise<UserProfile> {
  const doc = await UserModel.findOne({ uid });
  if (!doc) throw new Error("USER_NOT_FOUND");

  if (patch.inGameName !== undefined) {
    const name = patch.inGameName.trim();
    if (name === "") throw new Error("INGAMENAME_REQUIRED");
    const taken = await UserModel.findOne({
      inGameName: name,
      _id: { $ne: doc._id },
    }).lean();
    if (taken) throw new Error("INGAMENAME_ALREADY_EXISTS");
    doc.inGameName = name;
  }

  if (patch.whatsapp !== undefined) {
    const wa = patch.whatsapp.trim();
    if (wa !== "") {
      const taken = await UserModel.findOne({
        whatsapp: wa,
        _id: { $ne: doc._id },
      }).lean();
      if (taken) throw new Error("WHATSAPP_ALREADY_EXISTS");
    }
    doc.whatsapp = wa;
  }

  if (patch.bio !== undefined) doc.bio = patch.bio.slice(0, 500);
  if (patch.avatar !== undefined) doc.avatar = patch.avatar;

  await doc.save();
  return toUserProfile(doc);
}

export async function changeUserPassword(
  uid: string,
  currentPassword: string,
  newPassword: string,
): Promise<boolean> {
  const doc = await UserModel.findOne({ uid });
  if (!doc) throw new Error("USER_NOT_FOUND");
  if (!doc.password) throw new Error("PASSWORD_NOT_SET");

  const isValid = await bcrypt.compare(currentPassword, doc.password);
  if (!isValid) throw new Error("CURRENT_PASSWORD_WRONG");

  doc.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await doc.save();
  return true;
}

