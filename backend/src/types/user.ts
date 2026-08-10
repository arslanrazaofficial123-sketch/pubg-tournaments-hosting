export interface UserProfile {
  uid: string;
  inGameName: string;
  whatsapp: string;
  email?: string;
  name?: string;
  googleId?: string;
}

export interface RegisterPayload {
  uid: string;
  inGameName: string;
  whatsapp: string;
  password: string;
  recoveryPassword: string;
}

export interface LoginPayload {
  uid: string;
  password: string;
}
