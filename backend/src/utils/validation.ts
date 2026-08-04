export function isIntegerOnly(value: string): boolean {
  return value.length > 0 && /^\d+$/.test(value);
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return "Password must be at least 8 characters";
  }
  return null;
}

export function validateRegisterPayload(payload: {
  uid?: string;
  inGameName?: string;
  whatsapp?: string;
  password?: string;
  recoveryPassword?: string;
}): string | null {
  if (!payload.uid?.trim()) return "UID is required";
  if (!isIntegerOnly(payload.uid.trim())) return "UID must contain integers only";
  if (!payload.inGameName?.trim()) return "In-Game Name is required";
  if (!payload.whatsapp?.trim()) return "WhatsApp number is required";
  if (!isIntegerOnly(payload.whatsapp.trim())) {
    return "WhatsApp number must contain integers only";
  }

  const passwordError = validatePassword(payload.password ?? "");
  if (passwordError) return passwordError;

  const recoveryError = validatePassword(payload.recoveryPassword ?? "");
  if (recoveryError) return "Recovery password must be at least 8 characters";

  if (payload.password && payload.recoveryPassword && payload.password === payload.recoveryPassword) {
    return "Recovery password cannot be the same as password";
  }

  return null;
}
