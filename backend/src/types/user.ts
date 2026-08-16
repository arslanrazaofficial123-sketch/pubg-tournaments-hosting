export interface UserProfile {
  uid: string;
  inGameName: string;
  whatsapp: string;
  email?: string;
  name?: string;
  googleId?: string;
  avatar?: string;
  bio?: string;
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
