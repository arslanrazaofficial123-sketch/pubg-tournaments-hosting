"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Upload, Image, Trash2, User, Loader2, X, Shield, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { ContentPage } from "@/components/layout/ContentPage";
import { Button, Input } from "@/components/ui";
import { useAlert } from "@/components/ui/AlertProvider";
import { isLoggedIn, getSessionUser } from "@/lib/auth";

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

const STORAGE_KEY = "team_data";

const defaultTeam: TeamData = {
  teamName: "",
  teamLogo: "",
  format: "squad",
  players: [
    { uid: "", inGameName: "", picture: "" },
    { uid: "", inGameName: "", picture: "" },
    { uid: "", inGameName: "", picture: "" },
    { uid: "", inGameName: "", picture: "" },
  ],
};

export default function TeamDataPage() {
  const router = useRouter();
  const { showAlert } = useAlert();
  const [isLoading, setIsLoading] = useState(true);
  const [teamData, setTeamData] = useState<TeamData>(defaultTeam);
  const [uploadingPlayer, setUploadingPlayer] = useState<number | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    const loggedIn = isLoggedIn();
    if (!loggedIn) {
      router.push("/link-uid");
      return;
    }
    loadTeamData();
  }, [router]);

  const loadTeamData = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as TeamData;
        const user = getSessionUser();
        if (user && parsed.players.length > 0) {
          parsed.players[0].uid = parsed.players[0].uid || user.uid || "";
          parsed.players[0].inGameName = parsed.players[0].inGameName || user.inGameName || "";
        }
        setTeamData(parsed);
      } else {
        const user = getSessionUser();
        if (user) {
          setTeamData({
            ...defaultTeam,
            players: [
              { uid: user.uid || "", inGameName: user.inGameName || "", picture: "" },
              { uid: "", inGameName: "", picture: "" },
              { uid: "", inGameName: "", picture: "" },
              { uid: "", inGameName: "", picture: "" },
            ],
          });
        }
      }
    } catch (err) {
      console.error("Failed to load team data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const saveTeamData = (data: TeamData) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setTeamData(data);
  };

  const handleTeamNameChange = (name: string) => {
    saveTeamData({ ...teamData, teamName: name });
  };

  const handleFormatChange = (format: "solo" | "duo" | "squad") => {
    saveTeamData({ ...teamData, format });
  };

  const handlePlayerChange = (index: number, field: "uid" | "inGameName", value: string) => {
    const players = [...teamData.players];
    players[index] = { ...players[index], [field]: value };
    saveTeamData({ ...teamData, players });
  };

  const handlePictureUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showAlert("Please select an image file", "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showAlert("Image must be less than 5MB", "error");
      return;
    }

    setUploadingPlayer(index);
    const reader = new FileReader();
    reader.onload = (event) => {
      const players = [...teamData.players];
      players[index] = { ...players[index], picture: event.target?.result as string };
      saveTeamData({ ...teamData, players });
      setUploadingPlayer(null);
      showAlert(`Photo uploaded for Player ${index + 1}`, "success");
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePicture = (index: number) => {
    const players = [...teamData.players];
    players[index] = { ...players[index], picture: "" };
    saveTeamData({ ...teamData, players });
    showAlert("Photo removed", "info");
  };

  const handleTeamLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showAlert("Please select an image file", "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showAlert("Image must be less than 5MB", "error");
      return;
    }

    setUploadingLogo(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      saveTeamData({ ...teamData, teamLogo: event.target?.result as string });
      setUploadingLogo(false);
      showAlert("Team logo uploaded", "success");
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveTeamLogo = () => {
    saveTeamData({ ...teamData, teamLogo: "" });
    showAlert("Team logo removed", "info");
  };

  const maxPlayers = teamData.format === "solo" ? 1 : teamData.format === "duo" ? 2 : 4;
  const currentPlayers = teamData.players.slice(0, maxPlayers);

  const formatLabel = {
    solo: "Solo (1 Player)",
    duo: "Duo (2 Players)",
    squad: "Squad (4 Players)",
  };

  if (isLoading) {
    return (
      <ContentPage heading="Team Data" description="Manage your team information">
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      </ContentPage>
    );
  }

  return (
    <ContentPage
      heading="Team Data"
      description="Set up your team name, logo, and player information for tournament registrations"
    >
      {/* Team Info Section */}
      <div className="mb-6 rounded-xl border border-border bg-bg-primary/50 p-4">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-text-primary">
          <Shield className="h-4 w-4 text-accent" />
          Team Information
        </h3>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Team Name */}
          <Input
            label="Team Name"
            value={teamData.teamName}
            onChange={(e) => handleTeamNameChange(e.target.value)}
            placeholder="Enter your team name"
          />

          {/* Team Logo */}
          <div className="flex flex-col">
            <label className="block text-sm font-medium text-text-primary/90 mb-1">
              Team Logo
            </label>
            <div className="flex items-center gap-3">
              {teamData.teamLogo ? (
                <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-border">
                  <img src={teamData.teamLogo} alt="Team Logo" className="h-full w-full object-cover" />
                  <button
                    onClick={handleRemoveTeamLogo}
                    className="absolute top-0.5 right-0.5 rounded-full bg-red-600/90 p-0.5 text-white hover:bg-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border bg-bg-primary/50 transition-colors hover:border-accent/50">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleTeamLogoUpload}
                    className="hidden"
                  />
                  {uploadingLogo ? (
                    <Loader2 className="h-5 w-5 animate-spin text-accent" />
                  ) : (
                    <Upload className="h-5 w-5 text-text-primary/50" />
                  )}
                </label>
              )}
              <p className="text-xs text-text-primary/50">Square image recommended</p>
            </div>
          </div>
        </div>
      </div>

      {/* Team Format Selector */}
      <div className="mb-6 rounded-xl border border-border bg-bg-primary/50 p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-primary">
          <User className="h-4 w-4 text-accent" />
          Team Format
        </h3>
        <div className="flex flex-wrap gap-2">
          {(["solo", "duo", "squad"] as const).map((f) => (
            <button
              key={f}
              onClick={() => handleFormatChange(f)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                teamData.format === f
                  ? "bg-accent text-white shadow-sm"
                  : "bg-bg-primary border border-border text-text-primary/70 hover:border-accent/50"
              )}
            >
              {formatLabel[f]}
            </button>
          ))}
        </div>
      </div>

      {/* Players Section */}
      <div className="rounded-xl border border-border bg-bg-primary/50 p-4">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-text-primary">
          <User className="h-4 w-4 text-accent" />
          Players
        </h3>

        <div className="space-y-6">
          {currentPlayers.map((player, i) => (
            <div key={i} className="rounded-lg border border-border bg-bg-primary/30 p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
                  {i + 1}
                </span>
                <span className="text-sm font-medium text-text-primary">
                  Player {i + 1}
                  {i === 0 && (
                    <span className="ml-2 px-1.5 py-0.5 text-[10px] rounded-full bg-accent/20 text-accent">
                      You
                    </span>
                  )}
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]">
                {/* UID */}
                <Input
                  label="PUBG UID"
                  value={player.uid}
                  onChange={(e) => handlePlayerChange(i, "uid", e.target.value)}
                  placeholder="e.g. 5123456789"
                />

                {/* In-Game Name */}
                <Input
                  label="In-Game Name"
                  value={player.inGameName}
                  onChange={(e) => handlePlayerChange(i, "inGameName", e.target.value)}
                  placeholder="e.g. PlayerOne"
                />

                {/* Picture */}
                <div className="flex flex-col">
                  <label className="block text-sm font-medium text-text-primary/90 mb-1">
                    Picture
                  </label>
                  <div className="flex items-center gap-2">
                    {player.picture ? (
                      <div className="relative h-12 w-12 overflow-hidden rounded-full border border-border">
                        <img src={player.picture} alt={`Player ${i + 1}`} className="h-full w-full object-cover" />
                        <button
                          onClick={() => handleRemovePicture(i)}
                          className="absolute -top-0.5 -right-0.5 rounded-full bg-red-600/90 p-0.5 text-white hover:bg-red-600"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-border bg-bg-primary/50 transition-colors hover:border-accent/50">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handlePictureUpload(i, e)}
                          className="hidden"
                        />
                        {uploadingPlayer === i ? (
                          <Loader2 className="h-4 w-4 animate-spin text-accent" />
                        ) : (
                          <Upload className="h-4 w-4 text-text-primary/50" />
                        )}
                      </label>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* How it Works */}
      <div className="mt-8 rounded-2xl border border-border bg-bg-primary/50 p-6">
        <h2 className="mb-4 text-center text-lg font-semibold text-text-primary">How Team Data Works</h2>
        <div className="grid gap-4 text-center sm:grid-cols-3">
          <div className="space-y-2 p-4 rounded-xl border border-border bg-bg-primary/50">
            <Shield className="mx-auto h-8 w-8 text-accent" />
            <h3 className="font-semibold text-text-primary">Team Identity</h3>
            <p className="text-sm text-text-primary/50">Set your team name and logo for tournament brackets</p>
          </div>
          <div className="space-y-2 p-4 rounded-xl border border-border bg-bg-primary/50">
            <User className="mx-auto h-8 w-8 text-accent" />
            <h3 className="font-semibold text-text-primary">Player Info</h3>
            <p className="text-sm text-text-primary/50">Add UID, name, and photo for each team member</p>
          </div>
          <div className="space-y-2 p-4 rounded-xl border border-border bg-bg-primary/50">
            <Image className="mx-auto h-8 w-8 text-emerald-600" />
            <h3 className="font-semibold text-text-primary">Auto-Fill</h3>
            <p className="text-sm text-text-primary/50">Data auto-fills in tournament registration forms</p>
          </div>
        </div>
      </div>
    </ContentPage>
  );
}
