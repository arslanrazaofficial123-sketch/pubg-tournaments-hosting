"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { Tournament } from "@/types/tournament";
import { getSessionUser } from "@/lib/auth";
import { fetchUserByUid } from "@/services/api/auth";
import { registerForTournament } from "@/services/api/tournaments";
import { CreditCard, ChevronDown, ChevronUp, ImagePlus } from "lucide-react";

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
  const [members, setMembers] = useState<Array<{ uid: string; inGameName: string; picture?: string }>>([]);
  const [receiptBase64, setReceiptBase64] = useState("");
  const [teamLogoBase64, setTeamLogoBase64] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);

  const [currentUserInGameName, setCurrentUserInGameName] = useState("");

  // Initialize form with logged in user as member 0
  useEffect(() => {
    if (!isOpen) return;

    const currentUser = getSessionUser();
    if (!currentUser) return;

    setCurrentUserInGameName(currentUser.inGameName || "");
    setWhatsapp(currentUser.whatsapp || "");
    setTeamName("");
    setTransactionId("");
    setReceiptBase64("");
    setTeamLogoBase64("");
    setSelectedGroup("");
    setErrorMsg("");

    const initialMembers = Array.from({ length: memberCount }, (_, i) => {
      if (i === 0) {
        return {
          uid: currentUser.uid,
          inGameName: currentUser.inGameName || "",
        };
      }
      return { uid: "", inGameName: "" };
    });

    setMembers(initialMembers);
  }, [isOpen, memberCount]);

  const updateMember = (index: number, key: "uid" | "inGameName" | "picture", val: string) => {
    setMembers((current) =>
      current.map((m, i) => (i === index ? { ...m, [key]: val } : m))
    );
  };

  const handlePngUpload = (
    file: File | undefined,
    onDone: (base64: string) => void,
  ): string | null => {
    if (!file) return null;

    const isImage = file.type.startsWith("image/");
    if (!isImage) {
      return "Please choose an image file.";
    }

    const maxSize = 3 * 1024 * 1024;
    if (file.size > maxSize) {
      return "Image is too large. Please upload an image under 3 MB.";
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        onDone(reader.result);
      }
    };
    reader.readAsDataURL(file);
    return null;
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

  const handlePlayerPictureUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = handlePngUpload(file, (base64) => updateMember(index, "picture", base64));
    if (err) setErrorMsg(err);
    e.target.value = "";
  };

  const handleTeamLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = handlePngUpload(file, setTeamLogoBase64);
    if (err) setErrorMsg(err);
    e.target.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!whatsapp.trim()) {
      setErrorMsg("WhatsApp number is required.");
      return;
    }

    if (!transactionId.trim()) {
      setErrorMsg("Transaction ID is required.");
      return;
    }

    if (!isSolo && !teamName.trim()) {
      setErrorMsg("Team Name is required for group formats.");
      return;
    }

    if (!receiptBase64) {
      setErrorMsg("Please upload your payment receipt image.");
      return;
    }

    // Verify all members have UID
    const incomplete = members.find((m) => !m.uid.trim());
    if (incomplete) {
      setErrorMsg("All team members must have a UID.");
      return;
    }

    setIsSubmitting(true);

    try {
      await registerForTournament(tournament.id, {
        teamName: isSolo ? (members[0].inGameName || members[0].uid) : teamName.trim(),
        teamLogo: teamLogoBase64 || undefined,
        whatsapp: whatsapp.trim(),
        receiptImage: receiptBase64,
        transactionId: transactionId.trim(),
        members: members.map((m) => ({
          uid: m.uid.trim(),
          inGameName: m.inGameName.trim(),
          picture: m.picture || undefined,
        })),
        group: selectedGroup || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to submit registration. Please try again.");
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

        {/* Members List */}
        <div className="space-y-3 pt-1">
          <h4 className="text-xs sm:text-sm font-bold text-text-primary/95 border-b border-white/5 pb-1.5">
            Team Members ({members.length})
          </h4>
          <span className="text-[10px] sm:text-xs text-text-primary/45 block">
            Please enter each player's Player UID and In-Game Name.
          </span>

          <div className="space-y-3">
            {members.map((member, i) => (
              <div key={i} className="p-3 rounded-lg border border-white/5 bg-white/[0.01] space-y-2.5">
                <span className="block text-[10px] sm:text-xs font-bold uppercase tracking-wider text-accent">
                  Player {i + 1} {i === 0 && "(You)"}
                </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] sm:text-xs font-medium text-text-primary/80">
                        Player UID *
                      </label>
                      <input
                        type="text"
                        value={member.uid}
                        onChange={(e) => {
                          updateMember(i, "uid", e.target.value);
                        }}
                        disabled={i === 0}
                        placeholder="e.g. 58392019"
                        className="w-full rounded-md border border-border bg-bg-primary/60 px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm text-text-primary focus:border-accent focus:outline-none disabled:bg-white/[0.02] disabled:text-text-primary/50"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] sm:text-[10px] font-medium text-text-primary/80">
                        In-Game Name
                      </label>
                      <input
                        type="text"
                        value={member.inGameName}
                        onChange={(e) => updateMember(i, "inGameName", e.target.value)}
                        disabled={i === 0 && !!currentUserInGameName}
                        placeholder={i === 0 ? "e.g. MortalPlayer" : "e.g. MortalPlayer"}
                        className="w-full rounded-md border border-border bg-bg-primary/60 px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm text-text-primary focus:border-accent focus:outline-none disabled:bg-white/[0.02] disabled:text-text-primary/50"
                      />
                    </div>
                  </div>

                  {/* Player Picture Upload */}
                  <div className="flex items-center gap-3 pt-1">
                    <label className="flex-1 flex items-center gap-2.5 rounded-lg border border-dashed border-border bg-bg-primary/40 px-3 py-2 cursor-pointer hover:border-accent/50 hover:bg-accent/5 transition-colors">
                      <ImagePlus size={16} className="text-accent shrink-0" />
                      <span className="text-[10px] sm:text-xs text-text-primary/70 font-medium truncate">
                        {member.picture ? "Picture added - replace?" : "Upload Player Picture"}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handlePlayerPictureUpload(i, e)}
                        className="hidden"
                      />
                    </label>
                    {member.picture && (
                      <div className="relative shrink-0">
                        <img
                          src={member.picture}
                          alt={`Player ${i + 1} picture`}
                          className="h-12 w-12 rounded-full object-cover border border-accent/30"
                        />
                        <button
                          type="button"
                          onClick={() => updateMember(i, "picture", "")}
                          className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500/90 text-white text-[10px] font-bold leading-none hover:bg-red-600 transition-colors cursor-pointer"
                          aria-label="Remove picture"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
              </div>
            ))}
          </div>
        </div>

        {/* Team Name for Duo/Squad */}
        {!isSolo && (
          <>
            <Input
              label="Team Name *"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="e.g. Mortal Esports"
              required
            />

            {/* Team Logo Upload */}
            <div className="space-y-1.5">
              <label className="block text-xs sm:text-sm font-medium text-text-primary/90">
                Team Logo
              </label>
              <label className="flex items-center gap-2.5 rounded-lg border border-dashed border-border bg-bg-primary/40 px-3.5 py-3 cursor-pointer hover:border-accent/50 hover:bg-accent/5 transition-colors">
                <ImagePlus size={18} className="text-accent shrink-0" />
                <span className="text-xs sm:text-sm text-text-primary/70 font-medium truncate">
                  {teamLogoBase64 ? "Logo added - replace?" : "Upload Team Logo"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleTeamLogoUpload}
                  className="hidden"
                />
              </label>
              {teamLogoBase64 && (
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={teamLogoBase64}
                      alt="Team logo preview"
                      className="h-14 w-14 rounded-lg object-cover border border-accent/30 bg-white/5"
                    />
                    <button
                      type="button"
                      onClick={() => setTeamLogoBase64("")}
                      className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500/90 text-white text-[10px] font-bold leading-none hover:bg-red-600 transition-colors cursor-pointer"
                      aria-label="Remove logo"
                    >
                      ✕
                    </button>
                  </div>
                  <span className="text-[10px] sm:text-xs text-text-primary/40">
                    Logo will be shown to the admin for team verification (stored as PNG).
                  </span>
                </div>
              )}
            </div>
          </>
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
