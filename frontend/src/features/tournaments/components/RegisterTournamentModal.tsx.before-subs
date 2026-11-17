"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { Tournament } from "@/types/tournament";
import { getSessionUser } from "@/lib/auth";
import { fetchUserByUid } from "@/services/api/auth";
import { registerForTournament } from "@/services/api/tournaments";
import { getWalletSummary } from "@/services/api/wallet";
import { getTeamData } from "@/services/api/teamData";
import { CreditCard, ChevronDown, ChevronUp, Wallet, User, Camera } from "lucide-react";

function parseFee(fee: string | undefined): number {
  const match = String(fee ?? "").replace(/,/g, "").match(/\d+(\.\d+)?/);
  return match ? parseFloat(match[0]) : 0;
}

interface RegisterTournamentModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: Tournament;
  onSuccess: () => void;
}

export function RegisterTournamentModal({
  isOpen,
  onClose,
  tournament,
  onSuccess,
}: RegisterTournamentModalProps) {
  const isSolo = tournament.format.toLowerCase().includes("solo");
  const isDuo = tournament.format.toLowerCase().includes("duo");
  const isSquad = tournament.format.toLowerCase().includes("squad");

  const memberCount = isSolo ? 1 : isDuo ? 2 : 4;

  const [teamName, setTeamName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [members, setMembers] = useState<Array<{ uid: string; inGameName: string; photoUrl?: string }>>([]);
  const [receiptBase64, setReceiptBase64] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"manual" | "wallet">("manual");
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  const [currentUserInGameName, setCurrentUserInGameName] = useState("");
  const [savedTeamLogo, setSavedTeamLogo] = useState("");

interface TeamData {
  teamName: string;
  teamLogo: string;
  format: "solo" | "duo" | "squad";
  players: Array<{
    uid: string;
    inGameName: string;
    picture: string;
  }>;
}

async function loadTeamData(): Promise<TeamData | null> {
  const backendData = await getTeamData();
  if (backendData) return backendData;
  try {
    const stored = localStorage.getItem("team_data");
    if (stored) return JSON.parse(stored);
  } catch {}
  return null;
}

// Initialize form with logged in user as member 0
  useEffect(() => {
    if (!isOpen) return;

    const currentUser = getSessionUser();
    if (!currentUser) return;

    setCurrentUserInGameName(currentUser.inGameName || "");
    setWhatsapp(currentUser.whatsapp || "");
    setTransactionId("");
    setReceiptBase64("");
    setSelectedGroup("");
    setErrorMsg("");
    setPaymentMethod("manual");

    getWalletSummary()
      .then((s) => setWalletBalance(s.balance))
      .catch(() => setWalletBalance(null));

    loadTeamData().then((savedTeam) => {
      if (savedTeam) {
        setTeamName(savedTeam.teamName);
        setSavedTeamLogo(savedTeam.teamLogo || "");
      }

      const initialMembers = Array.from({ length: memberCount }, (_, i) => {
        const savedPlayer = savedTeam?.players?.[i];
        if (i === 0) {
          return {
            uid: currentUser.uid || savedPlayer?.uid || "",
            inGameName: currentUser.inGameName || savedPlayer?.inGameName || "",
            photoUrl: savedPlayer?.picture || "",
          };
        }
        return {
          uid: savedPlayer?.uid || "",
          inGameName: savedPlayer?.inGameName || "",
          photoUrl: savedPlayer?.picture || "",
        };
      });

      setMembers(initialMembers);
    });
  }, [isOpen, memberCount]);

  const updateMember = (index: number, key: "uid" | "inGameName", val: string) => {
    setMembers((current) =>
      current.map((m, i) => (i === index ? { ...m, [key]: val } : m))
    );
  };

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        setReceiptBase64(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!whatsapp.trim()) {
      setErrorMsg("WhatsApp number is required.");
      return;
    }

    const fee = parseFee(tournament.registrationFee);

    if (paymentMethod === "wallet" && fee > 0 && (walletBalance ?? 0) < fee) {
      setErrorMsg(
        `Insufficient wallet balance (${(walletBalance ?? 0).toLocaleString()} PKR). Entry fee is ${fee.toLocaleString()} PKR. Top up your wallet or use manual payment.`
      );
      return;
    }

    if (paymentMethod === "manual") {
      if (!transactionId.trim()) {
        setErrorMsg("Transaction ID is required.");
        return;
      }

      if (!receiptBase64) {
        setErrorMsg("Please upload your payment receipt image.");
        return;
      }
    }

    const validMembers = members.filter((m) => m.uid.trim());

    if (validMembers.length === 0) {
      setErrorMsg("At least one team member must have a UID.");
      return;
    }

    if (!isSolo && !teamName.trim()) {
      setErrorMsg("Team Name is required for group formats. Set it on the Team Data page.");
      return;
    }

    const savedTeam = await loadTeamData();

    setIsSubmitting(true);

    try {
      await registerForTournament(tournament.id, {
        teamName: isSolo ? (validMembers[0].inGameName || validMembers[0].uid) : teamName.trim(),
        whatsapp: whatsapp.trim(),
        receiptImage: paymentMethod === "manual" ? receiptBase64 : undefined,
        transactionId: paymentMethod === "manual" ? transactionId.trim() : undefined,
        paymentMethod,
        teamLogo: savedTeam?.teamLogo || undefined,
        members: validMembers.map((m, i) => ({
          uid: m.uid.trim(),
          inGameName: m.inGameName.trim() || m.uid.trim(),
          picture: m.photoUrl || savedTeam?.players?.[i]?.picture || undefined,
        })),
        group: selectedGroup || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      if (String(err?.message || "").includes("Insufficient wallet balance")) {
        setPaymentMethod("manual");
        setErrorMsg("Insufficient wallet balance. Please top up your wallet or pay manually with a receipt.");
      } else {
        setErrorMsg(err.message || "Failed to submit registration. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Register: ${tournament.title}`} width={600}>
      <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-3.5 sm:space-y-5">
        {errorMsg && (
          <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-lg text-xs sm:text-sm text-red-400">
            {errorMsg}
          </div>
        )}

        {/* Members List - Read-only from player-photos */}
        <div className="space-y-3 pt-1">
          <h4 className="text-xs sm:text-sm font-bold text-text-primary/95 border-b border-white/5 pb-1.5">
            Team Members ({members.length})
          </h4>
          <span className="text-[10px] sm:text-xs text-text-primary/45 block">
            Player details loaded from Team Data page. Edit there to update.
          </span>

          <div className="space-y-2">
            {members.map((member, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-white/5 bg-white/[0.01]">
                {member.photoUrl ? (
                  <img
                    src={member.photoUrl}
                    alt={member.inGameName || `Player ${i + 1}`}
                    className="h-12 w-12 rounded-lg object-cover border border-border shrink-0"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                    <User className="h-6 w-6 text-accent/50" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-accent">
                    Player {i + 1} {i === 0 && "(You)"}
                  </span>
                  <p className="text-sm font-semibold text-text-primary truncate">
                    {member.inGameName || "Not set"}
                  </p>
                  <p className="text-xs text-text-primary/50 font-mono truncate">
                    UID: {member.uid || "Not linked"}
                  </p>
                </div>
                {!member.uid && (
                  <a
                    href="/player-photos"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-bold text-accent hover:underline shrink-0"
                  >
                    Set up
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Team Name + Logo for Duo/Squad */}
        {!isSolo && (
          <div className="rounded-xl border border-white/5 bg-white/[0.01] p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-accent block mb-1.5">Team</span>
            <div className="flex items-center gap-3">
              {savedTeamLogo ? (
                <img
                  src={savedTeamLogo}
                  alt="Team Logo"
                  className="h-10 w-10 rounded-lg object-cover border border-border shrink-0"
                />
              ) : (
                <div className="h-10 w-10 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                  <User className="h-5 w-5 text-accent/50" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary truncate">
                  {teamName || "No team name set"}
                </p>
                {!teamName && (
                  <a
                    href="/player-photos"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-bold text-accent hover:underline"
                  >
                    Set up team name on Team Data page
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        <Input
          label="WhatsApp Number *"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          placeholder="e.g. +92 300 1234567"
          required
        />

        {/* Group Selection */}
        <div className="space-y-1.5">
          <label className="block text-xs sm:text-sm font-medium text-text-primary/90">
            Choose Group (Optional)
          </label>
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="w-full rounded-md border border-border bg-bg-primary/60 px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm text-text-primary focus:border-accent focus:outline-none cursor-pointer"
          >
            <option value="">Auto Assign</option>
            {Array.from({ length: tournament.numGroups || 0 }, (_, i) => {
              const letter = String.fromCharCode(65 + i);
              return (
                <option key={letter} value={`Group ${letter}`}>
                  Group {letter}
                </option>
              );
            })}
          </select>
        </div>

        {/* Payment Method Selection */}
        <div className="space-y-2">
          <label className="block text-xs sm:text-sm font-medium text-text-primary/90">
            Payment Method *
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setPaymentMethod("manual")}
              className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition-all cursor-pointer ${
                paymentMethod === "manual"
                  ? "border-accent bg-accent/10"
                  : "border-border bg-bg-primary/40 hover:border-accent/40"
              }`}
            >
              <CreditCard size={18} className="text-accent shrink-0 mt-0.5" />
              <span>
                <span className="block text-xs font-bold text-text-primary">Manual Payment</span>
                <span className="block text-[10px] text-text-primary/50 mt-0.5">
                  Pay via JazzCash / EasyPaisa and upload receipt
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod("wallet")}
              className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition-all cursor-pointer ${
                paymentMethod === "wallet"
                  ? "border-accent bg-accent/10"
                  : "border-border bg-bg-primary/40 hover:border-accent/40"
              }`}
            >
              <Wallet size={18} className="text-accent shrink-0 mt-0.5" />
              <span>
                <span className="block text-xs font-bold text-text-primary">Wallet Balance</span>
                <span className="block text-[10px] text-text-primary/50 mt-0.5">
                  {walletBalance === null
                    ? "Loading your balance..."
                    : `Balance: ${walletBalance.toLocaleString()} PKR`}
                </span>
              </span>
            </button>
          </div>
          {paymentMethod === "wallet" && (
            <p className="text-[10px] sm:text-xs text-text-primary/45">
              Entry fee ({tournament.registrationFee}) will be auto-deducted from your wallet balance.
            </p>
          )}
        </div>

        {/* Interactive Payment Details Toggle */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowPaymentDetails(!showPaymentDetails)}
            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-accent hover:text-accent-hover transition-colors cursor-pointer select-none"
          >
            <CreditCard size={14} />
            <span>Show Payment Account Details</span>
            {showPaymentDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showPaymentDetails && (
            <div className="rounded-xl border border-accent/25 bg-accent/5 p-4 space-y-2.5 animate-fade-in-up">
              <p className="text-xs text-text-primary/70">
                Please transfer the registration fee (<span className="text-accent font-bold">{tournament.registrationFee}</span>) to one of our official accounts:
              </p>
              <div className="space-y-1.5 text-xs pt-2 border-t border-white/5 font-medium">
                <div className="flex justify-between items-center">
                  <span className="text-text-primary/50">JazzCash / EasyPaisa:</span>
                  <span className="font-mono font-bold text-text-primary">03070830168 <span className="text-text-primary/40 font-normal">(Arslan Raza)</span></span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-primary/50">SadaPay:</span>
                  <span className="font-mono font-bold text-text-primary">03097955177 <span className="text-text-primary/40 font-normal">(Arslan Raza)</span></span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-primary/50">Alfalah Bank:</span>
                  <span className="font-mono font-bold text-text-primary">09851009475285 <span className="text-text-primary/40 font-normal">(Arslan Raza)</span></span>
                </div>
              </div>
            </div>
          )}
        </div>

        {paymentMethod === "manual" && (
          <>
            <Input
              label="Transaction ID / Reference Number *"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              placeholder="e.g. TXN10293847"
              required
            />

            {/* Payment Receipt Upload */}
            <div className="space-y-1.5 pt-1">
              <label className="block text-xs sm:text-sm font-medium text-text-primary/90">
                Upload Payment Receipt *
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleReceiptUpload}
                className="w-full rounded-md border border-border bg-bg-primary/60 px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm text-text-primary focus:border-accent focus:outline-none transition-colors file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:bg-accent/15 file:text-accent file:text-xs file:font-semibold hover:file:bg-accent/25 file:cursor-pointer"
                required
              />
              {receiptBase64 && (
                <div className="mt-2 h-24 w-40 overflow-hidden rounded border border-border bg-white/5">
                  <img
                    src={receiptBase64}
                    alt="Receipt preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          </>
        )}

        {/* Submit */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Registering..." : "Submit Registration"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
