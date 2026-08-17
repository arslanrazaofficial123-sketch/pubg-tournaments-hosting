import { TournamentModel } from "../models/Tournament.js";
import { RegistrationModel } from "../models/Registration.js";
import { UserModel } from "../models/User.js";
import { uploadImage } from "./storageService.js";
import { deductEntryFee, refundEntryFee } from "./walletService.js";
import { lookupPlayerByUid } from "./playerLookupService.js";
import type { Tournament, TournamentStatus } from "../types/tournament.js";

// registrationFee is free text ("Free", "500", "500 PKR") — extract the PKR number.
function parseFee(fee: string | undefined): number {
  if (!fee) return 0;
  const normalized = String(fee).trim().toLowerCase();
  if (normalized === "free" || normalized === "" || normalized === "0") return 0;
  const parsed = parseFloat(normalized.replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

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
    receiptImage?: string;
    transactionId?: string;
    paymentMethod?: "manual" | "wallet";
    registrarUid?: string;
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

  // 2. Advisory UID validation against PUBG/Midasbuy (fail-open due to API unreliability from Render)
  const lookupMap = new Map<string, { found: boolean; inGameName: string | null; error?: "not_found" | "lookup_failed" }>();
  for (const member of payload.members) {
    const lookup = await lookupPlayerByUid(member.uid.trim());
    if (!lookup.found) {
      console.warn(`Midasbuy lookup: member UID ${member.uid.trim()} not found (error: ${lookup.error}), allowing registration (fail-open)`);
    }
    if (lookup.error === "lookup_failed") {
      console.warn(`Midasbuy lookup failed for member UID ${member.uid.trim()}, allowing registration (fail-open)`);
    }
    // Optionally verify inGameName matches Midasbuy (case-insensitive) — advisory only
    const midasbuyName = lookup.inGameName?.toLowerCase().trim();
    const providedName = member.inGameName?.toLowerCase().trim();
    if (midasbuyName && providedName && providedName !== midasbuyName) {
      console.warn(`Midasbuy name mismatch for UID ${member.uid.trim()}: provided "${member.inGameName}", Midasbuy "${lookup.inGameName}"`);
    }
    lookupMap.set(member.uid.trim(), lookup);
  }

  // 3. Ensure each member is registered in the database, create if missing
  for (const member of payload.members) {
    const userInDb = await UserModel.findOne({ uid: member.uid });
    const lookup = lookupMap.get(member.uid.trim());
    const midasbuyName = lookup?.inGameName?.trim();
    if (!userInDb) {
      await UserModel.create({
        uid: member.uid.trim(),
        inGameName: midasbuyName || member.inGameName?.trim(),
      });
    } else if (member.inGameName && (!userInDb.inGameName || userInDb.inGameName.trim() === "")) {
      await UserModel.updateOne(
        { uid: member.uid },
        { $set: { inGameName: midasbuyName || member.inGameName.trim() } }
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

  let teamLogoUrl: string | undefined;
  if (payload.teamLogo) {
    teamLogoUrl = await uploadImage({
      kind: "team-logo",
      teamName: payload.teamName,
      dataUrl: payload.teamLogo,
    });
  }

  const membersWithPictures = await Promise.all(
    payload.members.map(async (m) => {
      if (!m.picture) return m;
      const pictureUrl = await uploadImage({
        kind: "player-picture",
        teamName: payload.teamName,
        uid: m.uid,
        dataUrl: m.picture,
      });
      return { ...m, picture: pictureUrl };
    })
  );

  const id = "reg-" + Math.random().toString(36).substring(2, 11);

  // Wallet payment: auto-deduct the entry fee before creating the registration.
  const paymentMethod = payload.paymentMethod === "wallet" ? "wallet" : "manual";
  const entryFee = paymentMethod === "wallet" ? parseFee(tournament.registrationFee) : 0;

  if (paymentMethod === "wallet" && entryFee > 0) {
    const payerUid = payload.registrarUid || payload.members[0]?.uid;
    if (!payerUid) {
      throw new Error("REGISTRAR_REQUIRED");
    }
    await deductEntryFee(
      payerUid,
      entryFee,
      tournamentId,
      id,
      `Entry fee for ${tournament.title}`,
    );
  }

  const registration = await RegistrationModel.create({
    id,
    tournamentId,
    teamName: payload.teamName,
    teamLogo: teamLogoUrl,
    group: assignedGroup,
    whatsapp: payload.whatsapp,
    receiptImage: payload.receiptImage,
    transactionId: payload.transactionId,
    paymentMethod,
    entryFee,
    status: "pending",
    members: membersWithPictures.map((m) => ({
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

  // Wallet-paid registrations get their entry fee refunded when rejected.
  if (
    status === "rejected" &&
    oldStatus !== "rejected" &&
    registration.get("paymentMethod") === "wallet" &&
    Number(registration.get("entryFee") || 0) > 0
  ) {
    const payerUid = (registration.get("members") || [])[0]?.uid;
    if (payerUid) {
      await refundEntryFee(
        payerUid,
        Number(registration.get("entryFee")),
        String(registration.get("tournamentId")),
        String(registration.get("id")),
        "Entry fee refund (registration rejected)",
      );
    }
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

