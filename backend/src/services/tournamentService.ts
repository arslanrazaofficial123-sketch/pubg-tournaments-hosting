import { TournamentModel } from "../models/Tournament.js";
import { RegistrationModel } from "../models/Registration.js";
import { UserModel } from "../models/User.js";
import type { Tournament, TournamentStatus } from "../types/tournament.js";

function toTournament(doc: Record<string, unknown>): Tournament {
  return {
    id: doc.id as string,
    title: doc.title as string,
    status: doc.status as TournamentStatus,
    description: doc.description as string,
    prizePool: doc.prizePool as string,
    format: doc.format as string,
    startDate: doc.startDate as string,
    endDate: doc.endDate as string,
    region: doc.region as string,
    maxTeams: doc.maxTeams as number,
    registeredTeams: doc.registeredTeams as number,
    registrationDeadline: doc.registrationDeadline as string,
    registrationFee: doc.registrationFee as string,
    numDays: doc.numDays as number,
    numGroups: doc.numGroups as number,
    teamsPerGroup: doc.teamsPerGroup as number,
    tournamentId: doc.tournamentId as string,
    images: doc.images as Tournament["images"],
  };
}

export async function findAllTournaments(): Promise<Tournament[]> {
  const docs = await TournamentModel.find().sort({ startDate: -1 }).lean();
  const list = docs.map((doc) => toTournament(doc));
  for (const t of list) {
    t.registeredTeams = await RegistrationModel.countDocuments({
      tournamentId: t.id,
      status: { $ne: "rejected" },
    });
  }
  return list;
}

export async function findTournamentsByStatus(
  status: TournamentStatus,
): Promise<Tournament[]> {
  const docs = await TournamentModel.find({ status }).sort({ startDate: -1 }).lean();
  const list = docs.map((doc) => toTournament(doc));
  for (const t of list) {
    t.registeredTeams = await RegistrationModel.countDocuments({
      tournamentId: t.id,
      status: { $ne: "rejected" },
    });
  }
  return list;
}

export async function findTournamentById(id: string): Promise<Tournament | null> {
  const doc = await TournamentModel.findOne({ id }).lean();
  if (!doc) return null;
  const t = toTournament(doc);
  t.registeredTeams = await RegistrationModel.countDocuments({
    tournamentId: t.id,
    status: { $ne: "rejected" },
  });
  return t;
}

export async function createTournament(
  payload: Tournament,
): Promise<Tournament> {
  const doc = await TournamentModel.create(payload);
  const t = toTournament(doc.toObject());
  t.registeredTeams = await RegistrationModel.countDocuments({
    tournamentId: t.id,
    status: { $ne: "rejected" },
  });
  return t;
}

export async function deleteTournamentById(id: string): Promise<boolean> {
  const result = await TournamentModel.deleteOne({ id });
  return result.deletedCount > 0;
}

export async function updateTournamentById(
  id: string,
  payload: Partial<Tournament>,
): Promise<Tournament | null> {
  const doc = await TournamentModel.findOneAndUpdate({ id }, payload, {
    new: true,
  });
  if (!doc) return null;
  const t = toTournament(doc.toObject());
  t.registeredTeams = await RegistrationModel.countDocuments({
    tournamentId: t.id,
    status: { $ne: "rejected" },
  });
  return t;
}

export async function registerPlayerForTournament(
  tournamentId: string,
  payload: {
    teamName?: string;
    teamLogo?: string;
    whatsapp: string;
    receiptImage: string;
    transactionId: string;
    members: Array<{ uid: string; inGameName: string; picture?: string }>;
    group?: string;
  },
): Promise<any> {
  const tournament = await TournamentModel.findOne({ id: tournamentId });
  if (!tournament) {
    throw new Error("TOURNAMENT_NOT_FOUND");
  }

  // 1. Validate unique team name for this tournament
  if (payload.teamName) {
    const existingTeam = await RegistrationModel.findOne({
      tournamentId,
      teamName: payload.teamName.trim(),
    }).lean();
    if (existingTeam) {
      throw new Error("TEAM_NAME_ALREADY_EXISTS");
    }
  }

  // 2. Ensure each member is registered in the database, create if missing
  for (const member of payload.members) {
    const userInDb = await UserModel.findOne({ uid: member.uid });
    if (!userInDb) {
      await UserModel.create({
        uid: member.uid.trim(),
        inGameName: member.inGameName ? member.inGameName.trim() : undefined,
      });
    } else if (member.inGameName && (!userInDb.inGameName || userInDb.inGameName.trim() === "")) {
      await UserModel.updateOne(
        { uid: member.uid },
        { $set: { inGameName: member.inGameName.trim() } }
      );
    }
  }

  let assignedGroup = payload.group;
  if (assignedGroup) {
    const validGroups = Array.from({ length: tournament.numGroups }, (_, i) => `Group ${String.fromCharCode(65 + i)}`);
    if (!validGroups.includes(assignedGroup)) {
      throw new Error("INVALID_GROUP");
    }

    const groupCount = await RegistrationModel.countDocuments({ tournamentId, group: assignedGroup });
    if (groupCount >= tournament.teamsPerGroup) {
      throw new Error("GROUP_FULL");
    }
  } else {
    // Count existing registrations to allocate groups sequentially
    const count = await RegistrationModel.countDocuments({ tournamentId });
    const groupIndex = Math.floor(count / tournament.teamsPerGroup);
    
    if (groupIndex >= tournament.numGroups) {
      throw new Error("TOURNAMENT_FULL");
    }

    const groupLetter = String.fromCharCode(65 + groupIndex); // 0 -> A, 1 -> B...
    assignedGroup = `Group ${groupLetter}`;
  }

  const id = "reg-" + Math.random().toString(36).substring(2, 11);
  const registration = await RegistrationModel.create({
    id,
    tournamentId,
    teamName: payload.teamName,
    teamLogo: payload.teamLogo,
    group: assignedGroup,
    whatsapp: payload.whatsapp,
    receiptImage: payload.receiptImage,
    transactionId: payload.transactionId,
    status: "pending",
    members: payload.members.map((m) => ({
      uid: m.uid,
      inGameName: m.inGameName,
      picture: m.picture,
    })),
  });

  await TournamentModel.updateOne(
    { id: tournamentId },
    { $inc: { registeredTeams: 1 } },
  );

  return registration.toObject();
}

export async function updateRegistrationStatus(
  registrationId: string,
  status: "approved" | "rejected" | "pending",
): Promise<any> {
  const registration = await RegistrationModel.findOne({ id: registrationId });
  if (!registration) {
    throw new Error("REGISTRATION_NOT_FOUND");
  }

  const oldStatus = registration.get("status") || "pending";
  if (oldStatus === status) {
    return registration.toObject();
  }

  registration.set("status", status);
  await registration.save();

  // If status changes to rejected, decrement registeredTeams count
  if (status === "rejected" && oldStatus !== "rejected") {
    await TournamentModel.updateOne(
      { id: registration.get("tournamentId") },
      { $inc: { registeredTeams: -1 } },
    );
  }
  // If status changes from rejected to approved or pending, increment registeredTeams count
  else if ((status === "approved" || status === "pending") && oldStatus === "rejected") {
    await TournamentModel.updateOne(
      { id: registration.get("tournamentId") },
      { $inc: { registeredTeams: 1 } },
    );
  }

  return registration.toObject();
}

export async function deleteRegistrationById(id: string): Promise<boolean> {
  const registration = await RegistrationModel.findOne({ id });
  if (!registration) return false;

  const status = registration.get("status") || "pending";
  await RegistrationModel.deleteOne({ id });

  // Decrement registeredTeams count if it was not rejected
  if (status !== "rejected") {
    await TournamentModel.updateOne(
      { id: registration.get("tournamentId") },
      { $inc: { registeredTeams: -1 } },
    );
  }
  return true;
}

export async function getAllRegistrations(tournamentId?: string, memberUid?: string): Promise<any[]> {
  const query: any = {};
  if (tournamentId) query.tournamentId = tournamentId;
  if (memberUid) query["members.uid"] = memberUid;
  return RegistrationModel.find(query).lean();
}

export async function updateRegistrationStats(
  registrationId: string,
  stats: {
    kills: number;
    chickenDinner: number;
    totalPoints: number;
    rank: number;
  },
): Promise<any> {
  const doc = await RegistrationModel.findOneAndUpdate(
    { id: registrationId },
    {
      $set: {
        kills: stats.kills,
        chickenDinner: stats.chickenDinner,
        totalPoints: stats.totalPoints,
        rank: stats.rank,
      },
    },
    { new: true }
  );
  if (!doc) {
    throw new Error("REGISTRATION_NOT_FOUND");
  }
  return doc.toObject();
}

