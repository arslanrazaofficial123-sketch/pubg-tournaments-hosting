export interface UserProfile {
  uid: string;
  inGameName: string;
  whatsapp: string;
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
