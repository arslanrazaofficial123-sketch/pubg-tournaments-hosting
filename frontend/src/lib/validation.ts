export function isIntegerOnly(value: string): boolean {
  return value.length > 0 && /^\d+$/.test(value);
}

export function sanitizeIntegerInput(value: string): string {
  return value.replace(/\D/g, "");
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return "Password must be at least 8 characters";
  }
  return null;
}
