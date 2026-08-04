"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { Tournament, TournamentStatus } from "@/types/tournament";

function parseFormattedDateTimeToInput(dateStr: string | undefined | null): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      const match = dateStr.match(/([a-zA-Z]+)\s+(\d{1,2}),?\s+(\d{4})/);
      if (match) {
        const cleanDateStr = `${match[1]} ${match[2]}, ${match[3]}`;
        const d2 = new Date(cleanDateStr);
        if (!isNaN(d2.getTime())) {
          const year = d2.getFullYear();
          const month = String(d2.getMonth() + 1).padStart(2, "0");
          const day = String(d2.getDate()).padStart(2, "0");
          return `${year}-${month}-${day}T20:00`;
        }
      }
      return "";
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch {
    return "";
  }
}

interface AddTournamentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Tournament, "id">) => Promise<void>;
  initialData?: Tournament | null;
}

export function AddTournamentModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}: AddTournamentModalProps) {
  const [title, setTitle] = useState("");
  const [format, setFormat] = useState<"Solo" | "Duo" | "Squad">("Squad");
  const [numDays, setNumDays] = useState(1);
  const [numGroups, setNumGroups] = useState(1);
  const [teamsPerGroup, setTeamsPerGroup] = useState(16);
  const [playersPerTeam, setPlayersPerTeam] = useState(4);
  const [startDateStr, setStartDateStr] = useState("");
  const [registrationDeadlineStr, setRegistrationDeadlineStr] = useState("");
  const [status, setStatus] = useState<TournamentStatus>("upcoming");
  const [description, setDescription] = useState("");
  const [prizePool, setPrizePool] = useState("PKR 10,000");
  const [registrationFee, setRegistrationFee] = useState("Free");
  const [bannerBase64, setBannerBase64] = useState<string>("");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setFormat(initialData.format as any);
      setNumDays(initialData.numDays || 1);
      setNumGroups(initialData.numGroups || 1);
      setTeamsPerGroup(initialData.teamsPerGroup || 16);
      setPrizePool(initialData.prizePool);
      setRegistrationFee(initialData.registrationFee);
      setStatus(initialData.status);
      setDescription(initialData.description);
      setBannerBase64(initialData.images.card);
      setStartDateStr(parseFormattedDateTimeToInput(initialData.startDate));
      setRegistrationDeadlineStr(parseFormattedDateTimeToInput(initialData.registrationDeadline));
    } else {
      setTitle("");
      setFormat("Squad");
      setNumDays(1);
      setNumGroups(1);
      setTeamsPerGroup(16);
      setStartDateStr("");
      setRegistrationDeadlineStr("");
      setPrizePool("PKR 10,000");
      setRegistrationFee("Free");
      setStatus("registration_open");
      setDescription("");
      setBannerBase64("");
      setBannerFile(null);
    }
  }, [initialData, isOpen]);

  // Automatically update players per team based on tournament type
  useEffect(() => {
    if (format === "Solo") setPlayersPerTeam(1);
    else if (format === "Duo") setPlayersPerTeam(2);
    else if (format === "Squad") setPlayersPerTeam(4);
  }, [format]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        setBannerBase64(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !title.trim() ||
      !startDateStr ||
      !registrationDeadlineStr ||
      !description.trim() ||
      !bannerBase64 ||
      !prizePool.trim() ||
      !registrationFee.trim()
    ) {
      setErrorMsg("Please fill out all required fields and upload a banner image.");
      return;
    }

    // Validate that start date is not before registration deadline
    if (startDateStr && registrationDeadlineStr) {
      const start = new Date(startDateStr);
      const deadline = new Date(registrationDeadlineStr);
      if (start.getTime() < deadline.getTime()) {
        setErrorMsg("Tournament start date and time cannot be before the registration deadline.");
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      // Calculate end date based on numDays
      const startDateTime = new Date(startDateStr);
      const endDateTime = new Date(
        startDateTime.getTime() + numDays * 24 * 60 * 60 * 1000
      );

      // Format date strings for UI (e.g. "July 6, 2026")
      const formatDate = (d: Date) => {
        return d.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        });
      };

      const generatedId = initialData?.tournamentId || `PUBG-TR-${Math.floor(1000 + Math.random() * 9000)}`;

      const payload: Omit<Tournament, "id"> = {
        title,
        status,
        description,
        prizePool,
        format: format,
        startDate: formatDate(startDateTime),
        endDate: formatDate(endDateTime),
        region: "PK",
        maxTeams: numGroups * teamsPerGroup,
        registeredTeams: initialData ? initialData.registeredTeams : 0,
        registrationDeadline: new Date(registrationDeadlineStr).toLocaleString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }),
        registrationFee,
        numDays,
        numGroups,
        teamsPerGroup,
        tournamentId: generatedId,
        images: {
          card: bannerBase64,
          modal: bannerBase64,
        },
      };

      await onSubmit(payload);
      // Reset form
      setTitle("");
      setFormat("Squad");
      setNumDays(1);
      setNumGroups(1);
      setTeamsPerGroup(16);
      setStartDateStr("");
      setRegistrationDeadlineStr("");
      setStatus("upcoming");
      setDescription("");
      setPrizePool("PKR 10,000");
      setRegistrationFee("Free");
      setBannerBase64("");
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to create tournament. Please try again.");
      setErrorMsg(err.message || "Failed to save tournament. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? "Edit Tournament" : "Add New Tournament"} width={750}>
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        {errorMsg && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
            {errorMsg}
          </div>
        )}

        <Input
          label="Tournament Name *"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. EPIX Ultimate Cup Season 3"
          required
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-primary/90">
              Format *
            </label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as any)}
              className="w-full rounded-md border border-border bg-bg-primary/60 px-4 py-3 text-sm text-text-primary focus:border-accent focus:outline-none transition-colors cursor-pointer"
              required
            >
              <option value="Solo" className="bg-bg-secondary text-text-primary">Solo</option>
              <option value="Duo" className="bg-bg-secondary text-text-primary">Duo</option>
              <option value="Squad" className="bg-bg-secondary text-text-primary">Squad</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-primary/90">
              Number of Days *
            </label>
            <input
              type="number"
              min={1}
              value={numDays}
              onChange={(e) => setNumDays(parseInt(e.target.value) || 1)}
              className="w-full rounded-md border border-border bg-bg-primary/60 px-4 py-3 text-sm text-text-primary focus:border-accent focus:outline-none transition-colors"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-primary/90">
              Number of Groups *
            </label>
            <input
              type="number"
              min={1}
              value={numGroups}
              onChange={(e) => setNumGroups(parseInt(e.target.value) || 1)}
              className="w-full rounded-md border border-border bg-bg-primary/60 px-4 py-3 text-sm text-text-primary focus:border-accent focus:outline-none transition-colors"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-primary/90">
              Teams Per Group *
            </label>
            <input
              type="number"
              min={1}
              value={teamsPerGroup}
              onChange={(e) => setTeamsPerGroup(parseInt(e.target.value) || 1)}
              className="w-full rounded-md border border-border bg-bg-primary/60 px-4 py-3 text-sm text-text-primary focus:border-accent focus:outline-none transition-colors"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-primary/90">
              Players Per Team (Auto)
            </label>
            <input
              type="number"
              value={playersPerTeam}
              className="w-full rounded-md border border-border bg-white/[0.02] px-4 py-3 text-sm text-text-primary/50 focus:outline-none cursor-not-allowed"
              disabled
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-primary/90">
              Start Date & Time *
            </label>
            <input
              type="datetime-local"
              value={startDateStr}
              onChange={(e) => setStartDateStr(e.target.value)}
              className="w-full rounded-md border border-border bg-bg-primary/60 px-4 py-3 text-sm text-text-primary focus:border-accent focus:outline-none transition-colors [&::-webkit-calendar-picker-indicator]:invert"
              required={!initialData}
            />
            {initialData && <span className="text-[10px] text-text-primary/40 block">Leave blank to keep start date unchanged</span>}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-primary/90">
              Registration Deadline *
            </label>
            <input
              type="datetime-local"
              value={registrationDeadlineStr}
              onChange={(e) => setRegistrationDeadlineStr(e.target.value)}
              className="w-full rounded-md border border-border bg-bg-primary/60 px-4 py-3 text-sm text-text-primary focus:border-accent focus:outline-none transition-colors [&::-webkit-calendar-picker-indicator]:invert"
              required={!initialData}
            />
            {initialData && <span className="text-[10px] text-text-primary/40 block">Leave blank to keep deadline unchanged</span>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-primary/90">
              Prize Pool *
            </label>
            <input
              type="text"
              value={prizePool}
              onChange={(e) => setPrizePool(e.target.value)}
              placeholder="e.g. PKR 15,000"
              className="w-full rounded-md border border-border bg-bg-primary/60 px-4 py-3 text-sm text-text-primary focus:border-accent focus:outline-none transition-colors"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-primary/90">
              Registration Fee *
            </label>
            <input
              type="text"
              value={registrationFee}
              onChange={(e) => setRegistrationFee(e.target.value)}
              placeholder="e.g. Free or PKR 500"
              className="w-full rounded-md border border-border bg-bg-primary/60 px-4 py-3 text-sm text-text-primary focus:border-accent focus:outline-none transition-colors"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-primary/90">
              Status *
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full rounded-md border border-border bg-bg-primary/60 px-4 py-3 text-sm text-text-primary focus:border-accent focus:outline-none transition-colors cursor-pointer"
              required
            >
              <option value="registration_open" className="bg-bg-secondary text-text-primary">Registration Open</option>
              <option value="upcoming" className="bg-bg-secondary text-text-primary">Upcoming</option>
              <option value="ongoing" className="bg-bg-secondary text-text-primary">Ongoing</option>
              <option value="ended" className="bg-bg-secondary text-text-primary">Ended</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-primary/90">
              Upload Banner *
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="w-full rounded-md border border-border bg-bg-primary/60 px-4 py-2.5 text-sm text-text-primary focus:border-accent focus:outline-none transition-colors file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:bg-accent/15 file:text-accent file:text-xs file:font-semibold hover:file:bg-accent/25 file:cursor-pointer"
              required={!initialData}
            />
            {initialData && <span className="text-[10px] text-text-primary/40 block">Leave blank to keep current banner</span>}
            {bannerBase64 && (
              <div className="mt-2 h-20 w-36 overflow-hidden rounded border border-border bg-white/5">
                <img
                  src={bannerBase64}
                  alt="Banner preview"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-text-primary/90">
            Description *
          </label>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the tournament rules, schedules, structure..."
            className="w-full rounded-md border border-border bg-bg-primary/60 px-4 py-3 text-sm text-text-primary focus:border-accent focus:outline-none transition-colors placeholder:text-text-primary/35"
            required
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : (initialData ? "Save Changes" : "Add Tournament")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
