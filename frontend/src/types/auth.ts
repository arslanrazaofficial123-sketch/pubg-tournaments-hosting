export interface UserProfile {
  uid: string;
  inGameName: string;
  whatsapp: string;
  email?: string;
  name?: string;
  token?: string;
  avatar?: string;
  bio?: string;
}

export interface SignUpFormData {
  uid: string;
  inGameName: string;
  whatsapp: string;
  password: string;
  recoveryPassword: string;
}

export interface SignInFormData {
  uid: string;
  password?: string;
  inGameName?: string;
}

export interface RegisterPayload extends SignUpFormData {}

export interface LoginPayload extends SignInFormData {}
