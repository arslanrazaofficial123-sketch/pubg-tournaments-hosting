import { MatchModel } from "../models/Match.js";
import { v4 as uuidv4 } from "uuid";

export async function createMatch(payload: {
  tournamentId: string;
  day: number;
  stage?: number;
  title: string;
  map: string;
  time: string;
  date: string;
  groups?: string[];
  roomId?: string;
  roomPassword?: string;
  revealAt?: string;
  autoSend?: boolean;
}) {
  const matchId = `match-${uuidv4().substring(0, 8)}`;
  const match = new MatchModel({
    id: matchId,
    ...payload,
  });
  await match.save();
  return match.toObject();
}

export async function getMatches(tournamentId?: string, day?: number) {
  const query: any = {};
  if (tournamentId) query.tournamentId = tournamentId;
  if (day !== undefined) query.day = day;

  return MatchModel.find(query).sort({ createdAt: 1 }).lean();
}

export async function deleteMatchById(matchId: string) {
  const result = await MatchModel.deleteOne({ id: matchId });
  return result.deletedCount > 0;
}

export async function updateMatchById(
  matchId: string,
  payload: Partial<{
    stage: number;
    title: string;
    map: string;
    time: string;
    date: string;
    groups?: string[];
    roomId?: string;
    roomPassword?: string;
    revealAt?: string;
    autoSend?: boolean;
  }>,
) {
  /* a new room, password or reveal time means the credentials have to go out again */
  const current = await MatchModel.findOne({ id: matchId }).lean();
  const changed =
    current &&
    (("roomId" in payload && payload.roomId !== current.roomId) ||
      ("roomPassword" in payload && payload.roomPassword !== current.roomPassword) ||
      ("revealAt" in payload && (payload.revealAt || "") !== (current.revealAt || "")));

  const match = await MatchModel.findOneAndUpdate(
    { id: matchId },
    changed ? { ...payload, credentialsSentAt: "" } : payload,
    { new: true }
  );
  return match ? match.toObject() : null;
}
