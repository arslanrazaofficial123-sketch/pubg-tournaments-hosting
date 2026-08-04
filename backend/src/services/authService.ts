import bcrypt from "bcryptjs";
import { UserModel } from "../models/User.js";
import type {
  LoginPayload,
  RegisterPayload,
  UserProfile,
} from "../types/user.js";

const SALT_ROUNDS = 10;

function toUserProfile(doc: any): UserProfile {
  return {
    uid: doc.uid,
    inGameName: doc.inGameName || "",
    whatsapp: doc.whatsapp || "",
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

  const existingWhatsapp = await UserModel.findOne({ whatsapp: payload.whatsapp.trim() }).lean();
  if (existingWhatsapp) {
    throw new Error("WHATSAPP_ALREADY_EXISTS");
  }

  const existingInGameName = await UserModel.findOne({ inGameName: payload.inGameName.trim() }).lean();
  if (existingInGameName) {
    throw new Error("INGAMENAME_ALREADY_EXISTS");
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

