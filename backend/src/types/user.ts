export interface TeamPlayerData {
  uid: string;
  inGameName: string;
  picture: string;
}

export interface TeamData {
  teamName: string;
  teamLogo: string;
  format: "solo" | "duo" | "squad";
  players: TeamPlayerData[];
}

export interface UserProfile {
  uid: string;
  inGameName: string;
  whatsapp: string;
  email?: string;
  name?: string;
  googleId?: string;
  avatar?: string;
  bio?: string;
  teamData?: TeamData;
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
