import { MatchModel } from "../models/Match.js";
import { v4 as uuidv4 } from "uuid";

export async function createMatch(payload: {
  tournamentId: string;
  day: number;
  title: string;
  map: string;
  time: string;
  date: string;
  groups?: string[];
  roomId?: string;
  roomPassword?: string;
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
    title: string;
    map: string;
    time: string;
    date: string;
    groups?: string[];
    roomId?: string;
    roomPassword?: string;
  }>,
) {
  const match = await MatchModel.findOneAndUpdate(
    { id: matchId },
    payload,
    { new: true }
  );
  return match ? match.toObject() : null;
}
