"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getTournaments, createTournament, deleteTournament, updateTournament, fetchAllRegistrations, updateRegistrationStatus, eliminateRegistration, updateRegistrationStats, type Registration } from "@/services/api/tournaments";
import { fetchMatches, createMatch, deleteMatch, updateMatch } from "@/services/api/matches";
import { getAdminReviews, updateReviewStatus, deleteReview } from "@/services/api/reviews";
import type { Review } from "@/types/review";
import { fetchAllUsers, deleteAccount, verifyAdminPassword, changeAdminPassword } from "@/services/api/auth";
import { TournamentModal } from "@/features/tournaments/components/TournamentModal";
import { AddTournamentModal } from "@/features/tournaments/components/AddTournamentModal";
import type { Tournament } from "@/types/tournament";
import type { UserProfile } from "@/types/auth";
import { Button, Modal, useAlert } from "@/components/ui";
import { cn } from "@/lib/utils";
import { Trophy, Users, FileText, LayoutGrid, Calendar, BarChart3, Settings, MessageSquare } from "lucide-react";

type ActiveTab = "overview" | "tournaments" | "users" | "registrations" | "groups" | "matches" | "settings" | "leaderboards" | "reviews";

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-accent">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <p className="text-lg font-bold text-text-primary/70">
        {message}
      </p>
    </div>
  );
}

export default function AdminDashboard() {
  const { showAlert, showConfirm } = useAlert();
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState("");
  const [adminAuthError, setAdminAuthError] = useState("");
  const [isVerifyingAdmin, setIsVerifyingAdmin] = useState(false);

  useEffect(() => {
    // Clear admin authentication state on load/refresh so they must login again
    sessionStorage.removeItem("admin_authenticated");
    sessionStorage.removeItem("admin_token");
    setIsAdminAuthenticated(false);
  }, []);

  const handleAdminAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminAuthError("");
    setIsVerifyingAdmin(true);
    try {
      const success = await verifyAdminPassword(adminPasswordInput);
      if (success) {
        sessionStorage.setItem("admin_authenticated", "true");
        setIsAdminAuthenticated(true);
      } else {
        setAdminAuthError("Incorrect admin password.");
      }
    } catch {
      setAdminAuthError("Failed to authenticate. Server error.");
    } finally {
      setIsVerifyingAdmin(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("admin_authenticated");
    sessionStorage.removeItem("admin_token");
    setIsAdminAuthenticated(false);
  };

  const [activeTab, setActiveTab] = useState<ActiveTab>("tournaments");
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [activeRegTournamentId, setActiveRegTournamentId] = useState<string | null>(null);
  const [activeGroupTournamentId, setActiveGroupTournamentId] = useState<string | null>(null);
  const [activeMatchTournamentId, setActiveMatchTournamentId] = useState<string | null>(null);
  const [activeMatchDay, setActiveMatchDay] = useState<number>(1);
  const [matches, setMatches] = useState<any[]>([]);
  const [activeLeaderboardTournamentId, setActiveLeaderboardTournamentId] = useState<string | null>(null);
  const [editingStatsRegId, setEditingStatsRegId] = useState<string | null>(null);
  const [statsKills, setStatsKills] = useState<number>(0);
  const [statsChickenDinner, setStatsChickenDinner] = useState<number>(0);
  const [statsTotalPoints, setStatsTotalPoints] = useState<number>(0);
  const [statsRank, setStatsRank] = useState<number>(0);

  // Form states for creating matches
  const [newMatchTitle, setNewMatchTitle] = useState("");
  const [newMatchMap, setNewMatchMap] = useState("Erangel");
  const [newMatchDateTime, setNewMatchDateTime] = useState(() => {
    const today = new Date();
    const datePart = today.toISOString().split("T")[0];
    return `${datePart}T20:00`;
  });
  const [newMatchRoomId, setNewMatchRoomId] = useState("");
  const [newMatchRoomPassword, setNewMatchRoomPassword] = useState("");
  const [selectedGroups, setSelectedGroups] = useState<string[]>(["Group A"]);
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);

  // States for changing admin password in Settings
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState("");
  const [changePasswordSuccess, setChangePasswordSuccess] = useState("");

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePasswordError("");
    setChangePasswordSuccess("");

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setChangePasswordError("All fields are required.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setChangePasswordError("New password and confirm password do not match.");
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await changeAdminPassword(currentPassword, newPassword);
      if (res.success) {
        setChangePasswordSuccess(res.message || "Password updated successfully.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
      } else {
        setChangePasswordError(res.message || "Failed to change password.");
      }
    } catch (err: any) {
      setChangePasswordError(err?.message || "Failed to change password. Server error.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const currentMatchTournament = tournaments.find((t) => t.id === activeMatchTournamentId);
  const groupsList = currentMatchTournament
    ? Array.from(
      { length: currentMatchTournament.numGroups || 1 },
      (_, i) => `Group ${String.fromCharCode(65 + i)}`
    )
    : ["Group A"];

  const [expandedReceipt, setExpandedReceipt] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (!isAdminAuthenticated) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    async function loadData() {
      try {
        const [tourns, usrList, regList] = await Promise.all([
          getTournaments(),
          fetchAllUsers(),
          fetchAllRegistrations(),
        ]);
        setTournaments(tourns);
        setUsers(usrList);
        setRegistrations(regList);

        const activeTourns = tourns.filter((t) => t.status === "registration_open" || t.status === "ongoing");
        if (activeTourns.length > 0) {
          setActiveRegTournamentId(activeTourns[0].id);
          setActiveGroupTournamentId(activeTourns[0].id);
        }

        const regOpenTourns = tourns.filter((t) => t.status === "registration_open");
        if (regOpenTourns.length > 0) {
          setActiveMatchTournamentId(regOpenTourns[0].id);
        }

        const ongoingTourns = tourns.filter((t) => t.status === "ongoing");
        if (ongoingTourns.length > 0) {
          setActiveLeaderboardTournamentId(ongoingTourns[0].id);
        }
      } catch (err) {
        console.error("Failed to load admin data:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [isAdminAuthenticated]);

  const handleUpdateRegStatus = async (regId: string, status: "approved" | "rejected" | "pending") => {
    try {
      await updateRegistrationStatus(regId, status);
      const regList = await fetchAllRegistrations();
      setRegistrations(regList);

      // Update tournaments data too as the count of registered teams might have changed
      const tourns = await getTournaments();
      setTournaments(tourns);
    } catch (err) {
      console.error("Failed to update registration status:", err);
      showAlert("Failed to update registration status. Please try again.", "error");
    }
  };

  const handleEliminateTeam = (regId: string, teamName: string) => {
    showConfirm(`Are you sure you want to eliminate "${teamName}"? This will permanently delete their registration.`, async () => {
      try {
        await eliminateRegistration(regId);
        const regList = await fetchAllRegistrations();
        setRegistrations(regList);

        const tourns = await getTournaments();
        setTournaments(tourns);
      } catch (err) {
        console.error("Failed to eliminate team:", err);
        showAlert("Failed to eliminate team. Please try again.", "error");
      }
    });
  };

  const handleDeleteUser = (uid: string, inGameName: string) => {
    showConfirm(`Are you sure you want to permanently delete player "${inGameName}" (UID: ${uid})?`, async () => {
      try {
        await deleteAccount(uid);
        const data = await fetchAllUsers();
        setUsers(data);
        showAlert("User account deleted successfully.", "success");
      } catch (err) {
        console.error("Failed to delete user:", err);
        showAlert("Failed to delete user account. Please try again.", "error");
      }
    });
  };

  const handleSelectTournament = (tournament: Tournament) => {
    setSelectedTournament(tournament);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTournament(null);
  };

  useEffect(() => {
    if (activeTab === "matches" && activeMatchTournamentId) {
      setSelectedGroups(["Group A"]);
      async function loadMatches() {
        try {
          const matchList = await fetchMatches(activeMatchTournamentId || undefined, activeMatchDay);
          setMatches(matchList);
        } catch (err) {
          console.error("Failed to fetch matches:", err);
        }
      }
      loadMatches();
    }
  }, [activeTab, activeMatchTournamentId, activeMatchDay]);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsStatusFilter, setReviewsStatusFilter] = useState<string>("all");

  useEffect(() => {
    if (activeTab !== "reviews") return;
    async function loadReviews() {
      try {
        const list = await getAdminReviews(reviewsStatusFilter === "all" ? undefined : reviewsStatusFilter);
        setReviews(list);
      } catch (err) {
        console.error("Failed to fetch reviews:", err);
      }
    }
    loadReviews();
  }, [activeTab, reviewsStatusFilter]);

  const handleReviewStatus = async (review: Review, status: "pending" | "approved" | "rejected") => {
    try {
      await updateReviewStatus(review.id, status);
      const list = await getAdminReviews(reviewsStatusFilter === "all" ? undefined : reviewsStatusFilter);
      setReviews(list);
      showAlert(`Review ${status === "approved" ? "approved" : status === "rejected" ? "rejected" : "moved to pending"} successfully.`, "success");
    } catch (err) {
      console.error("Failed to update review status:", err);
      showAlert("Failed to update review status.", "error");
    }
  };

  const handleDeleteReview = (review: Review) => {
    showConfirm(`Are you sure you want to permanently delete the review by "${review.name}"?`, async () => {
      try {
        await deleteReview(review.id);
        const list = await getAdminReviews(reviewsStatusFilter === "all" ? undefined : reviewsStatusFilter);
        setReviews(list);
        showAlert("Review deleted successfully.", "success");
      } catch (err) {
        console.error("Failed to delete review:", err);
        showAlert("Failed to delete review.", "error");
      }
    });
  };

  const handleCreateMatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMatchTournamentId || !newMatchTitle || !newMatchDateTime) {
      showAlert("Please fill in all required fields.", "warning");
      return;
    }

    const [datePart, timePart] = newMatchDateTime.split("T");

    const currentTournament = tournaments.find((t) => t.id === activeMatchTournamentId);
    if (currentTournament) {
      const tourneyStart = new Date(currentTournament.startDate);
      const matchStart = new Date(newMatchDateTime);

      if (matchStart.getTime() < tourneyStart.getTime()) {
        showAlert(`Match date and time cannot be before the tournament start date (${currentTournament.startDate}).`, "warning");
        return;
      }
    }

    try {
      if (editingMatchId) {
        await updateMatch(editingMatchId, {
          title: newMatchTitle,
          map: newMatchMap,
          time: timePart || "20:00",
          date: datePart,
          groups: selectedGroups,
          roomId: newMatchRoomId,
          roomPassword: newMatchRoomPassword,
        });
        setEditingMatchId(null);
      } else {
        await createMatch({
          tournamentId: activeMatchTournamentId,
          day: activeMatchDay,
          title: newMatchTitle,
          map: newMatchMap,
          time: timePart || "20:00",
          date: datePart,
          groups: selectedGroups,
          roomId: newMatchRoomId,
          roomPassword: newMatchRoomPassword,
        });
      }
      // Clear form
      setNewMatchTitle("");
      setNewMatchRoomId("");
      setNewMatchRoomPassword("");
      setSelectedGroups(["Group A"]);
      const today = new Date();
      const datePartToday = today.toISOString().split("T")[0];
      setNewMatchDateTime(`${datePartToday}T20:00`);
      setIsMatchModalOpen(false);
      // Reload matches list
      const matchList = await fetchMatches(activeMatchTournamentId || undefined, activeMatchDay);
      setMatches(matchList);
      showAlert(editingMatchId ? "Match updated successfully!" : "Match created successfully!", "success");
    } catch (err) {
      console.error("Failed to save match:", err);
      showAlert("Failed to save match.", "error");
    }
  };

  const handleEditMatchClick = (match: any) => {
    // Standardize datetime formatting for <input type="datetime-local">
    let datePart = "";
    if (match.date) {
      const matchDateObj = new Date(match.date);
      if (!isNaN(matchDateObj.getTime())) {
        const year = matchDateObj.getFullYear();
        const month = String(matchDateObj.getMonth() + 1).padStart(2, "0");
        const day = String(matchDateObj.getDate()).padStart(2, "0");
        datePart = `${year}-${month}-${day}`;
      } else {
        const dateMatch = match.date.trim().match(/(\d{4})-(\d{2})-(\d{2})/);
        if (dateMatch) {
          datePart = dateMatch[0];
        }
      }
    }

    let timePart = "20:00";
    if (match.time) {
      const timeMatch = match.time.trim().match(/^(\d{1,2}):(\d{2})/);
      if (timeMatch) {
        timePart = `${String(parseInt(timeMatch[1], 10)).padStart(2, "0")}:${timeMatch[2]}`;
      }
    }

    setEditingMatchId(match.id);
    setNewMatchTitle(match.title);
    setNewMatchMap(match.map);
    setNewMatchDateTime(datePart ? `${datePart}T${timePart}` : "");
    setSelectedGroups(match.groups || ["Group A"]);
    setNewMatchRoomId(match.roomId || "");
    setNewMatchRoomPassword(match.roomPassword || "");
    setIsMatchModalOpen(true);
  };

  const handleCancelEditMatch = () => {
    setEditingMatchId(null);
    setNewMatchTitle("");
    setNewMatchRoomId("");
    setNewMatchRoomPassword("");
    setSelectedGroups(["Group A"]);
    const today = new Date();
    const datePartToday = today.toISOString().split("T")[0];
    setNewMatchDateTime(`${datePartToday}T20:00`);
    setIsMatchModalOpen(false);
  };

  const handleDeleteMatch = (matchId: string, matchTitle: string) => {
    showConfirm(`Are you sure you want to delete match "${matchTitle}"?`, async () => {
      try {
        await deleteMatch(matchId);
        const matchList = await fetchMatches(activeMatchTournamentId || undefined, activeMatchDay);
        setMatches(matchList);
        showAlert("Match deleted successfully.", "success");
      } catch (err) {
        console.error("Failed to delete match:", err);
        showAlert("Failed to delete match.", "error");
      }
    });
  };

  const handleCreateTournament = async (newTournamentData: Omit<Tournament, "id">) => {
    try {
      if (editingTournament) {
        const payload = {
          ...newTournamentData,
          startDate: newTournamentData.startDate || editingTournament.startDate,
          endDate: newTournamentData.endDate || editingTournament.endDate,
          registrationDeadline: newTournamentData.registrationDeadline || editingTournament.registrationDeadline,
          images: {
            card: newTournamentData.images.card || editingTournament.images.card,
            modal: newTournamentData.images.modal || editingTournament.images.modal,
          }
        };
        await updateTournament(editingTournament.id, payload);
      } else {
        await createTournament(newTournamentData);
      }
      const data = await getTournaments();
      setTournaments(data);
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const handleDeleteTournament = (id: string, title: string) => {
    showConfirm(`Are you sure you want to permanently delete "${title}"?`, async () => {
      try {
        await deleteTournament(id);
        const data = await getTournaments();
        setTournaments(data);
        showAlert("Tournament deleted successfully.", "success");
      } catch (err) {
        console.error("Failed to delete tournament:", err);
        showAlert("Failed to delete tournament. Please try again.", "error");
      }
    });
  };

  const handleStartEditStats = (reg: Registration) => {
    setEditingStatsRegId(reg.id);
    setStatsKills(reg.kills ?? 0);
    setStatsChickenDinner(reg.chickenDinner ?? 0);
    setStatsTotalPoints(reg.totalPoints ?? 0);
    setStatsRank(reg.rank ?? 0);
  };

  const handleSaveStats = async (regId: string) => {
    try {
      await updateRegistrationStats(regId, {
        kills: statsKills,
        chickenDinner: statsChickenDinner,
        totalPoints: statsTotalPoints,
        rank: statsRank,
      });
      setEditingStatsRegId(null);
      const regList = await fetchAllRegistrations();
      setRegistrations(regList);
      showAlert("Stats saved successfully.", "success");
    } catch (err) {
      console.error("Failed to save stats:", err);
      showAlert("Failed to save stats.", "error");
    }
  };

  const handleResetStats = (regId: string) => {
    showConfirm("Are you sure you want to reset stats for this team?", async () => {
      try {
        await updateRegistrationStats(regId, {
          kills: 0,
          chickenDinner: 0,
          totalPoints: 0,
          rank: 0,
        });
        const regList = await fetchAllRegistrations();
        setRegistrations(regList);
        showAlert("Stats reset successfully.", "success");
      } catch (err) {
        console.error("Failed to reset stats:", err);
        showAlert("Failed to reset stats.", "error");
      }
    });
  };

  const filteredTournaments = tournaments.filter((t) =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Stats calculation
  const totalTournaments = tournaments.length;
  const ongoingCount = tournaments.filter((t) => t.status === "ongoing").length;
  const upcomingCount = tournaments.filter((t) => t.status === "upcoming").length;
  const endedCount = tournaments.filter((t) => t.status === "ended").length;

  const openOrOngoingTournaments = tournaments.filter(
    (t) => t.status === "registration_open" || t.status === "ongoing"
  );

  const selectedTournRegistrations = registrations.filter(
    (r) => r.tournamentId === activeRegTournamentId
  );

  if (!isAdminAuthenticated) {
    return (
      <div className="min-h-screen bg-bg-primary text-text-primary flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-bg-secondary rounded-xl border border-border p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute right-0 top-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-accent/5 blur-3xl" />
          
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/15 text-accent border border-accent/20">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h1 className="text-xl font-black uppercase tracking-tight">Admin Authentication</h1>
            <p className="text-xs text-text-primary/50 max-w-xs">
              This area is restricted. Please enter the administration password to access the panel.
            </p>
          </div>

          <form onSubmit={handleAdminAuthSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-text-primary/75">
                Admin Password
              </label>
              <input
                type="password"
                placeholder="Enter password..."
                value={adminPasswordInput}
                onChange={(e) => setAdminPasswordInput(e.target.value)}
                className="w-full bg-bg-primary border border-border rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-accent transition-colors font-semibold"
                required
                disabled={isVerifyingAdmin}
                autoFocus
              />
            </div>

            {adminAuthError && (
              <p className="text-xs font-bold text-red-500/90 flex items-center gap-1.5 justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {adminAuthError}
              </p>
            )}

            <Button type="submit" fullWidth disabled={isVerifyingAdmin} className="py-3">
              {isVerifyingAdmin ? "Verifying..." : "Access Panel"}
            </Button>
          </form>

          <div className="pt-2 text-center">
            <Link
              href="/"
              className="text-xs font-bold text-text-primary/40 hover:text-accent transition-colors uppercase tracking-wider"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-bg-primary text-text-primary overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`bg-bg-secondary border-r border-border flex flex-col justify-between shrink-0 transition-all duration-300 ${isSidebarCollapsed ? "w-20" : "w-64"
          }`}
      >
        <div className="flex flex-col">
          {/* Logo / Branding */}
          <div className="p-4 border-b border-border flex items-center gap-3 overflow-hidden h-20 shrink-0">
            <img
              src="/images/logo.png"
              alt="Logo"
              className="w-10 h-10 object-contain shrink-0"
            />
            {!isSidebarCollapsed && (
              <div className="flex flex-col min-w-0">
                <h1 className="text-md font-bold tracking-wider text-text-primary uppercase truncate">
                  EPIX Esports
                </h1>
                <span className="text-[10px] text-text-primary/50 uppercase tracking-widest font-semibold">
                  Admin Portal
                </span>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            {[
              {
                id: "tournaments",
                label: "Tournaments",
                icon: <Trophy className="w-5 h-5 shrink-0" />,
              },
              {
                id: "users",
                label: "Users",
                icon: <Users className="w-5 h-5 shrink-0" />,
              },
              {
                id: "registrations",
                label: "Registrations",
                icon: <FileText className="w-5 h-5 shrink-0" />,
              },
              {
                id: "groups",
                label: "Groups",
                icon: <LayoutGrid className="w-5 h-5 shrink-0" />,
              },
              {
                id: "matches",
                label: "Matches",
                icon: <Calendar className="w-5 h-5 shrink-0" />,
              },
              {
                id: "reviews",
                label: "Reviews",
                icon: <MessageSquare className="w-5 h-5 shrink-0" />,
              },
              {
                id: "leaderboards",
                label: "Leaderboards",
                icon: <BarChart3 className="w-5 h-5 shrink-0" />,
              },
              {
                id: "settings",
                label: "Settings",
                icon: <Settings className="w-5 h-5 shrink-0" />,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ActiveTab)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer ${isSidebarCollapsed ? "justify-center" : ""
                  } ${activeTab === tab.id
                    ? "bg-accent text-bg-primary shadow-lg shadow-accent/20"
                    : "text-text-primary/70 hover:bg-white/5 hover:text-text-primary"
                  }`}
                title={isSidebarCollapsed ? tab.label : undefined}
              >
                {tab.icon}
                {!isSidebarCollapsed && <span>{tab.label}</span>}
              </button>
            ))}
          </nav>
        </div>

        {/* Back link & Logout */}
        <div className="p-4 border-t border-border space-y-2">
          <Link
            href="/"
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-white/[0.02] text-xs font-semibold text-text-primary/70 hover:border-accent hover:text-accent transition-colors"
            title={isSidebarCollapsed ? "Back to Site" : undefined}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            {!isSidebarCollapsed && <span>Back to Site</span>}
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-red-500/30 bg-red-500/5 text-xs font-semibold text-red-400 hover:bg-red-500/10 hover:border-red-500/50 transition-colors cursor-pointer"
            title={isSidebarCollapsed ? "Logout" : undefined}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {!isSidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-20 border-b border-border flex items-center justify-between px-8 bg-bg-secondary/40 backdrop-blur-md">
          <div className="flex items-center gap-4">
            {/* Toggle Sidebar Button */}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-2 rounded-lg border border-border bg-white/[0.02] hover:bg-white/5 hover:border-accent text-text-primary transition-all cursor-pointer flex items-center justify-center"
              title="Toggle Sidebar"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="flex flex-col">
              <h2 className="text-xl font-bold capitalize text-text-primary">
                {activeTab}
              </h2>
              <span className="text-xs text-text-primary/40 mt-0.5">
                Dashboard / {activeTab}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-xs font-bold text-accent">
              <div className="w-1.5 h-1.5 rounded-full bg-accent" />
              Live Server
            </div>
          </div>
        </header>

        {/* Content Pane */}
        <div className="flex-1 overflow-y-auto p-8 modal-scrollbar">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="w-8 h-8 rounded-full border-4 border-accent border-t-transparent animate-spin" />
            </div>
          ) : activeTab === "tournaments" ? (
            <div className="space-y-8 max-w-7xl mx-auto animate-fade-in-up">
              {/* Stat Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                {[
                  { label: "Total Tournaments", val: totalTournaments, border: "border-border" },
                  { label: "Ongoing Active", val: ongoingCount, border: "border-accent/20 text-accent" },
                  { label: "Upcoming Soon", val: upcomingCount, border: "border-accent/20 text-accent" },
                  { label: "Ended/Archived", val: endedCount, border: "border-border/50 text-text-primary/40" },
                ].map((st, i) => (
                  <div
                    key={i}
                    className={`p-5 rounded-xl bg-bg-secondary border ${st.border} shadow-md`}
                  >
                    <span className="text-xs font-semibold text-text-primary/40 uppercase tracking-wider block">
                      {st.label}
                    </span>
                    <span className="text-3xl font-extrabold block mt-2 text-text-primary">
                      {st.val}
                    </span>
                  </div>
                ))}
              </div>

              {/* Tournament Management Controls */}
              <div className="bg-bg-secondary border border-border rounded-2xl overflow-hidden shadow-xl">
                {/* Search / Filter Section */}
                <div className="p-6 border-b border-border flex flex-col md:flex-row items-center justify-between gap-4 bg-white/[0.01]">
                  <div className="relative w-full md:w-80">
                    <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-text-primary/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search tournament title..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-bg-primary/50 border border-border hover:border-accent/40 focus:border-accent rounded-lg pl-10 pr-4 py-2 text-sm text-text-primary placeholder:text-text-primary/30 outline-none transition-colors"
                    />
                  </div>

                  <Button
                    variant="primary"
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 text-xs py-2 px-4 shadow-md"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Add Tournament
                  </Button>
                </div>

                {/* Data Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-white/[0.01] text-xs font-bold uppercase tracking-wider text-text-primary/50">
                        <th className="px-6 py-4">Tournament Details</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Registrations</th>
                        <th className="px-6 py-4">Prize Pool</th>
                        <th className="px-6 py-4">Start Date</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 text-sm">
                      {filteredTournaments.length > 0 ? (
                        filteredTournaments.map((tournament) => (
                          <tr
                            key={tournament.id}
                            className="hover:bg-white/[0.01] transition-colors"
                          >
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="font-semibold text-text-primary">
                                  {tournament.title}
                                </span>
                                <span className="text-xs text-text-primary/40 mt-0.5 flex items-center gap-1.5">
                                  <span className="text-accent font-semibold">{tournament.tournamentId}</span>
                                  <span>·</span>
                                  <span>{tournament.format}</span>
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${tournament.status === "ongoing"
                                    ? "bg-accent/15 text-accent"
                                    : tournament.status === "upcoming"
                                      ? "bg-accent/15 text-accent"
                                      : "bg-white/10 text-text-primary/40"
                                  }`}
                              >
                                {tournament.status}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-text-primary">
                                  {tournament.registeredTeams}
                                </span>
                                <span className="text-text-primary/30">/</span>
                                <span className="text-text-primary/50">
                                  {tournament.maxTeams}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 font-semibold text-accent">
                              {tournament.prizePool}
                            </td>
                            <td className="px-6 py-4 text-text-primary/60">
                              {tournament.startDate}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleSelectTournament(tournament)}
                                  className="px-3 py-1.5 rounded bg-white/5 border border-border text-xs font-semibold text-text-primary/70 hover:border-accent hover:text-accent transition-all cursor-pointer"
                                >
                                  View
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingTournament(tournament);
                                    setIsAddModalOpen(true);
                                  }}
                                  className="px-3 py-1.5 rounded bg-white/5 border border-border text-xs font-semibold text-text-primary/70 hover:border-accent hover:text-accent transition-all cursor-pointer"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteTournament(tournament.id, tournament.title)}
                                  className="px-3 py-1.5 rounded bg-white/5 border border-red-500/40 text-xs font-semibold text-red-400 hover:bg-red-500/10 hover:border-red-500/60 transition-all cursor-pointer"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-text-primary/40">
                            No tournaments match your search.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : activeTab === "users" ? (
            <div className="space-y-8 max-w-7xl mx-auto animate-fade-in-up">
              <div className="rounded-2xl border border-border bg-bg-secondary overflow-hidden">
                <div className="p-6 border-b border-border bg-white/[0.01] flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-text-primary">Registered Players</h3>
                    <p className="text-xs text-text-primary/40 mt-1">Manage and audit registered player accounts</p>
                  </div>
                  <span className="px-3 py-1 rounded bg-white/5 border border-border text-xs font-semibold text-text-primary/60">
                    {users.length} Total
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-white/[0.01] text-xs font-bold uppercase tracking-wider text-text-primary/50">
                        <th className="px-6 py-4">Player UID</th>
                        <th className="px-6 py-4">In-Game Name</th>
                        <th className="px-6 py-4">WhatsApp Contact</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 text-sm">
                      {users.length > 0 ? (
                        users.map((user) => (
                          <tr key={user.uid} className="hover:bg-white/[0.01] transition-colors">
                            <td className="px-6 py-4 font-mono text-accent">
                              {user.uid}
                            </td>
                            <td className="px-6 py-4 font-semibold text-text-primary">
                              {user.inGameName}
                            </td>
                            <td className="px-6 py-4 text-text-primary/70">
                              {user.whatsapp}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => handleDeleteUser(user.uid, user.inGameName)}
                                className="px-3 py-1.5 rounded bg-white/5 border border-red-500/40 text-xs font-semibold text-red-400 hover:bg-red-500/10 hover:border-red-500/60 transition-all cursor-pointer"
                              >
                                Delete Account
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center text-text-primary/40">
                            No registered users found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : activeTab === "registrations" ? (
            <div className="space-y-8 max-w-7xl mx-auto animate-fade-in-up">
              {/* Sub-navigation tabs for Open or Ongoing Tournaments */}
              <div className="border-b border-white/5 pb-3 mb-6">
                {openOrOngoingTournaments.length > 0 ? (
                  <ul className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
                    {openOrOngoingTournaments.map((t) => {
                      const isActive = activeRegTournamentId === t.id;
                      return (
                        <li key={t.id}>
                          <button
                            type="button"
                            onClick={() => setActiveRegTournamentId(t.id)}
                            className={cn(
                              "relative block px-4 py-3 text-sm font-medium transition-all duration-300 cursor-pointer",
                              isActive
                                ? "text-text-primary font-semibold"
                                : "text-text-primary/60 hover:text-text-primary/95"
                            )}
                          >
                            {t.title}
                            <span
                              className={cn(
                                "absolute bottom-0 left-4 right-4 h-0.5 rounded-full bg-accent transition-all duration-300 origin-center",
                                isActive ? "opacity-100 scale-x-100" : "opacity-0 scale-x-0"
                              )}
                            />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <EmptyState message="No active (registration open or ongoing) tournaments found." />
                )}
              </div>

              {activeRegTournamentId && openOrOngoingTournaments.some(t => t.id === activeRegTournamentId) && (
                <div className="rounded-2xl border border-border bg-bg-secondary overflow-hidden">
                  <div className="p-6 border-b border-border bg-white/[0.01] flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-text-primary">Registrations List</h3>
                      <p className="text-xs text-text-primary/40 mt-1">
                        Viewing registered teams and solo players for the selected tournament
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded bg-white/5 border border-border text-xs font-semibold text-text-primary/60">
                      {selectedTournRegistrations.length} Teams/Players
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-border bg-white/[0.01] text-xs font-bold uppercase tracking-wider text-text-primary/50">
                          <th className="px-6 py-4">Team/Player Name</th>
                          <th className="px-6 py-4">WhatsApp Contact</th>
                          <th className="px-6 py-4">Members Details</th>
                          <th className="px-6 py-4">Receipt</th>
                          <th className="px-6 py-4">Transaction ID</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60 text-sm">
                        {selectedTournRegistrations.length > 0 ? (
                          selectedTournRegistrations.map((reg) => (
                            <tr key={reg.id} className="hover:bg-white/[0.01] transition-colors">
                              <td className="px-6 py-4 font-semibold text-text-primary">
                                <div className="flex flex-col">
                                  <span>{reg.teamName || "Solo Player"}</span>
                                  <span className="text-[11px] text-accent font-semibold mt-0.5 uppercase tracking-wider">{reg.group}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-text-primary/70 font-mono">
                                {reg.whatsapp}
                              </td>
                              <td className="px-6 py-4">
                                <div className="space-y-1.5">
                                  {reg.members.map((m, idx) => (
                                    <div key={m.uid} className="flex items-center gap-2 text-xs">
                                      <span className="text-accent font-semibold">P{idx + 1}:</span>
                                      <span className="text-text-primary">{m.inGameName}</span>
                                      <span className="text-text-primary/40 font-mono">({m.uid})</span>
                                    </div>
                                  ))}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                {reg.receiptImage ? (
                                  <button
                                    onClick={() => setExpandedReceipt(reg.receiptImage)}
                                    className="relative h-12 w-20 overflow-hidden rounded border border-border bg-white/5 cursor-pointer hover:scale-105 hover:border-accent transition-all group flex items-center justify-center"
                                  >
                                    <img
                                      src={reg.receiptImage}
                                      alt="Receipt thumbnail"
                                      className="h-full w-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                                        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                                      </svg>
                                    </div>
                                  </button>
                                ) : (
                                  <span className="text-xs text-text-primary/30">No receipt</span>
                                )}
                              </td>
                              <td className="px-6 py-4 font-mono text-xs text-text-primary/80">
                                {reg.transactionId || "N/A"}
                              </td>
                              <td className="px-6 py-4">
                                <span
                                  className={cn(
                                    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider",
                                    reg.status === "approved"
                                      ? "bg-green-500/15 text-green-400"
                                      : reg.status === "rejected"
                                        ? "bg-red-500/15 text-red-400"
                                        : "bg-yellow-500/15 text-yellow-400"
                                  )}
                                >
                                  {reg.status || "pending"}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {(!reg.status || reg.status === "pending") && (
                                    <>
                                      <button
                                        onClick={() => handleUpdateRegStatus(reg.id, "approved")}
                                        className="px-2 py-1 rounded bg-green-500/10 border border-green-500/30 text-xs font-semibold text-green-400 hover:bg-green-500/20 transition-all cursor-pointer"
                                      >
                                        Approve
                                      </button>
                                      <button
                                        onClick={() => handleUpdateRegStatus(reg.id, "rejected")}
                                        className="px-2 py-1 rounded bg-red-500/10 border border-red-500/30 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-all cursor-pointer"
                                      >
                                        Reject
                                      </button>
                                    </>
                                  )}
                                  {reg.status && reg.status !== "pending" && (
                                    <button
                                      onClick={() => handleUpdateRegStatus(reg.id, "pending")}
                                      className="px-2 py-1 rounded bg-white/5 border border-border text-xs font-semibold text-text-primary/55 hover:text-text-primary transition-all cursor-pointer"
                                    >
                                      Reset
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={7} className="px-6 py-12 text-center text-text-primary/40">
                              No registrations for this tournament yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : activeTab === "groups" ? (
            <div className="space-y-8 max-w-7xl mx-auto animate-fade-in-up">
              {/* Sub-navigation tabs for Open or Ongoing Tournaments */}
              <div className="border-b border-white/5 pb-3 mb-6">
                {openOrOngoingTournaments.length > 0 ? (
                  <ul className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
                    {openOrOngoingTournaments.map((t) => {
                      const isActive = activeGroupTournamentId === t.id;
                      return (
                        <li key={t.id}>
                          <button
                            type="button"
                            onClick={() => setActiveGroupTournamentId(t.id)}
                            className={cn(
                              "relative block px-4 py-3 text-sm font-medium transition-all duration-300 cursor-pointer",
                              isActive
                                ? "text-text-primary font-semibold"
                                : "text-text-primary/60 hover:text-text-primary/95"
                            )}
                          >
                            {t.title}
                            <span
                              className={cn(
                                "absolute bottom-0 left-4 right-4 h-0.5 rounded-full bg-accent transition-all duration-300 origin-center",
                                isActive ? "opacity-100 scale-x-100" : "opacity-0 scale-x-0"
                              )}
                            />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <EmptyState message="No active (registration open or ongoing) tournaments found." />
                )}
              </div>

              {activeGroupTournamentId && openOrOngoingTournaments.some(t => t.id === activeGroupTournamentId) && (
                <div className="space-y-6">
                  {(() => {
                    const tournRegs = registrations.filter((r) => r.tournamentId === activeGroupTournamentId);

                    // Group registrations by group name
                    const grouped = tournRegs.reduce((acc, reg) => {
                      const groupName = reg.group || "Unassigned";
                      if (!acc[groupName]) acc[groupName] = [];
                      acc[groupName].push(reg);
                      return acc;
                    }, {} as Record<string, Registration[]>);

                    const groupNames = Object.keys(grouped).sort();

                    if (groupNames.length === 0) {
                      return (
                        <EmptyState message="No registrations or groups allocated yet." />
                      );
                    }

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {groupNames.map((gName) => (
                          <div key={gName} className="rounded-2xl border border-border bg-bg-secondary overflow-hidden shadow-md">
                            <div className="p-5 border-b border-border bg-white/[0.01] flex items-center justify-between">
                              <h4 className="font-bold text-text-primary uppercase tracking-wide">{gName}</h4>
                              <span className="px-2.5 py-0.5 rounded bg-accent/10 border border-accent/20 text-xs font-semibold text-accent">
                                {grouped[gName].length} Teams
                              </span>
                            </div>
                            <div className="divide-y divide-border/60">
                              {grouped[gName].map((reg) => (
                                <div key={reg.id} className="p-4 flex flex-col gap-3 hover:bg-white/[0.01] transition-colors">
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-sm text-text-primary">
                                      {reg.teamName || "Solo Player"}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <span
                                        className={cn(
                                          "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                                          reg.status === "approved"
                                            ? "bg-green-500/15 text-green-400"
                                            : reg.status === "rejected"
                                              ? "bg-red-500/15 text-red-400"
                                              : "bg-yellow-500/15 text-yellow-400"
                                        )}
                                      >
                                        {reg.status || "pending"}
                                      </span>
                                      <button
                                        onClick={() => handleEliminateTeam(reg.id, reg.teamName || "Solo Player")}
                                        className="px-2 py-0.5 rounded bg-red-500/10 border border-red-500/30 text-[10px] font-semibold text-red-400 hover:bg-red-500/20 transition-all cursor-pointer"
                                      >
                                        Eliminate
                                      </button>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-3 text-xs">
                                    {reg.members.map((m, idx) => (
                                      <div key={m.uid} className="flex flex-col text-[11px] text-text-primary/75">
                                        <span className="font-semibold text-text-primary">P{idx + 1}: {m.inGameName}</span>
                                        <span className="text-[9px] font-mono text-text-primary/40 leading-none">({m.uid})</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          ) : activeTab === "leaderboards" ? (
            <div className="space-y-8 max-w-7xl mx-auto animate-fade-in-up">
              {/* Sub-navigation tabs for Ongoing Tournaments */}
              <div className="border-b border-white/5 pb-3 mb-6">
                {tournaments.filter((t) => t.status === "ongoing").length > 0 ? (
                  <ul className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
                    {tournaments
                      .filter((t) => t.status === "ongoing")
                      .map((t) => {
                        const isActive = activeLeaderboardTournamentId === t.id;
                        return (
                          <li key={t.id}>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveLeaderboardTournamentId(t.id);
                                setEditingStatsRegId(null);
                              }}
                              className={cn(
                                "relative block rounded-lg px-4 py-3 text-sm font-medium transition-all duration-300 cursor-pointer",
                                isActive
                                  ? "bg-white/5 text-text-primary font-semibold"
                                  : "text-text-primary/60 hover:bg-white/5 hover:text-text-primary/95"
                              )}
                            >
                              {t.title}
                              <span
                                className={cn(
                                  "absolute bottom-0 left-4 right-4 h-0.5 rounded-full bg-accent transition-all duration-300 origin-center",
                                  isActive ? "opacity-100 scale-x-100" : "opacity-0 scale-x-0"
                                )}
                              />
                            </button>
                          </li>
                        );
                      })}
                  </ul>
                ) : (
                  <EmptyState message="No ongoing tournaments found." />
                )}
              </div>

              {activeLeaderboardTournamentId && (
                <div className="space-y-6">
                  {(() => {
                    const tournRegs = registrations.filter((r) => r.tournamentId === activeLeaderboardTournamentId && r.status === "approved");
                    
                    // Group registrations by group name
                    const grouped = tournRegs.reduce((acc, reg) => {
                      const groupName = reg.group || "Unassigned";
                      if (!acc[groupName]) acc[groupName] = [];
                      acc[groupName].push(reg);
                      return acc;
                    }, {} as Record<string, Registration[]>);

                    const groupNames = Object.keys(grouped).sort();

                    if (groupNames.length === 0) {
                      return (
                        <EmptyState message="No approved registrations or groups allocated yet." />
                      );
                    }

                    return (
                      <div className="space-y-8">
                        {groupNames.map((gName) => {
                          const sortedRegs = [...grouped[gName]].sort((a, b) => {
                            const rankA = a.rank || 999999;
                            const rankB = b.rank || 999999;
                            if (rankA !== rankB) return rankA - rankB;
                            return (b.totalPoints ?? 0) - (a.totalPoints ?? 0);
                          });

                          return (
                            <div key={gName} className="rounded-2xl border border-border bg-bg-secondary overflow-hidden shadow-md">
                              <div className="p-5 border-b border-border bg-white/[0.01] flex items-center justify-between">
                                <h4 className="font-bold text-text-primary uppercase tracking-wide">{gName}</h4>
                                <span className="px-2.5 py-0.5 rounded bg-accent/10 border border-accent/20 text-xs font-semibold text-accent">
                                  {sortedRegs.length} Teams
                                </span>
                              </div>
                              <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                  <thead>
                                    <tr className="border-b border-border bg-white/[0.01] text-xs font-bold uppercase tracking-wider text-text-primary/50">
                                      <th className="px-6 py-4">Team/Player</th>
                                      <th className="px-6 py-4">Members</th>
                                      <th className="px-6 py-4 w-24">Kills</th>
                                      <th className="px-6 py-4 w-28">Chicken Dinner</th>
                                      <th className="px-6 py-4 w-28">Total Points</th>
                                      <th className="px-6 py-4 w-24">Rank</th>
                                      <th className="px-6 py-4 text-right w-44">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-border/60 text-sm">
                                    {sortedRegs.map((reg) => {
                                      const isEditing = editingStatsRegId === reg.id;
                                      return (
                                        <tr key={reg.id} className="hover:bg-white/[0.01] transition-colors">
                                          <td className="px-6 py-4 font-semibold text-text-primary">
                                            {reg.teamName || "Solo Player"}
                                          </td>
                                          <td className="px-6 py-4">
                                            <div className="space-y-1">
                                              {reg.members.map((m, idx) => (
                                                <div key={m.uid} className="text-xs text-text-primary/70">
                                                  <span className="text-accent font-semibold">P{idx + 1}:</span> {m.inGameName}
                                                </div>
                                              ))}
                                            </div>
                                          </td>
                                          <td className="px-6 py-4">
                                            {isEditing ? (
                                              <input
                                                type="number"
                                                value={statsKills}
                                                onChange={(e) => setStatsKills(Math.max(0, parseInt(e.target.value) || 0))}
                                                className="w-16 bg-bg-primary border border-border rounded px-2 py-1 text-sm text-text-primary focus:outline-none focus:border-accent"
                                              />
                                            ) : (
                                              reg.kills ?? 0
                                            )}
                                          </td>
                                          <td className="px-6 py-4">
                                            {isEditing ? (
                                              <input
                                                type="number"
                                                value={statsChickenDinner}
                                                onChange={(e) => setStatsChickenDinner(Math.max(0, parseInt(e.target.value) || 0))}
                                                className="w-16 bg-bg-primary border border-border rounded px-2 py-1 text-sm text-text-primary focus:outline-none focus:border-accent"
                                              />
                                            ) : (
                                              reg.chickenDinner ?? 0
                                            )}
                                          </td>
                                          <td className="px-6 py-4">
                                            {isEditing ? (
                                              <input
                                                type="number"
                                                value={statsTotalPoints}
                                                onChange={(e) => setStatsTotalPoints(Math.max(0, parseInt(e.target.value) || 0))}
                                                className="w-20 bg-bg-primary border border-border rounded px-2 py-1 text-sm text-text-primary focus:outline-none focus:border-accent"
                                              />
                                            ) : (
                                              <span className="font-bold text-accent">{reg.totalPoints ?? 0}</span>
                                            )}
                                          </td>
                                          <td className="px-6 py-4">
                                            {isEditing ? (
                                              <input
                                                type="number"
                                                value={statsRank}
                                                onChange={(e) => setStatsRank(Math.max(0, parseInt(e.target.value) || 0))}
                                                className="w-16 bg-bg-primary border border-border rounded px-2 py-1 text-sm text-text-primary focus:outline-none focus:border-accent"
                                              />
                                            ) : (
                                              reg.rank && reg.rank > 0 ? `#${reg.rank}` : "-"
                                            )}
                                          </td>
                                          <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                              {isEditing ? (
                                                <>
                                                  <button
                                                    onClick={() => handleSaveStats(reg.id)}
                                                    className="px-2.5 py-1 rounded bg-green-500/10 border border-green-500/30 text-xs font-semibold text-green-400 hover:bg-green-500/20 transition-all cursor-pointer animate-fade-in-up"
                                                  >
                                                    Save
                                                  </button>
                                                  <button
                                                    onClick={() => setEditingStatsRegId(null)}
                                                    className="px-2.5 py-1 rounded bg-white/5 border border-border text-xs font-semibold text-text-primary/75 hover:bg-white/10 transition-all cursor-pointer animate-fade-in-up"
                                                  >
                                                    Cancel
                                                  </button>
                                                </>
                                              ) : (
                                                <>
                                                  <button
                                                    onClick={() => handleStartEditStats(reg)}
                                                    className="px-2.5 py-1 rounded bg-white/5 border border-border text-xs font-semibold text-text-primary/70 hover:border-accent hover:text-accent transition-all cursor-pointer"
                                                  >
                                                    Edit
                                                  </button>
                                                  <button
                                                    onClick={() => handleResetStats(reg.id)}
                                                    className="px-2.5 py-1 rounded bg-red-500/10 border border-red-500/30 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-all cursor-pointer"
                                                  >
                                                    Reset
                                                  </button>
                                                </>
                                              )}
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          ) : activeTab === "matches" ? (
            <div className="space-y-8 max-w-7xl mx-auto animate-fade-in-up">
              {/* Sub-navigation tabs for Registration Open Tournaments */}
              <div className="border-b border-white/5 pb-3 mb-6">
                {tournaments.filter((t) => t.status === "registration_open").length > 0 ? (
                  <ul className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
                    {tournaments
                      .filter((t) => t.status === "registration_open")
                      .map((t) => {
                        const isActive = activeMatchTournamentId === t.id;
                        return (
                          <li key={t.id}>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMatchTournamentId(t.id);
                                setActiveMatchDay(1);
                              }}
                              className={cn(
                                "relative block px-4 py-3 text-sm font-medium transition-all duration-300 cursor-pointer",
                                isActive
                                  ? "text-text-primary font-semibold"
                                  : "text-text-primary/60 hover:text-text-primary/95"
                              )}
                            >
                              {t.title}
                              <span
                                className={cn(
                                  "absolute bottom-0 left-4 right-4 h-0.5 rounded-full bg-accent transition-all duration-300 origin-center",
                                  isActive ? "opacity-100 scale-x-100" : "opacity-0 scale-x-0"
                                )}
                              />
                            </button>
                          </li>
                        );
                      })}
                  </ul>
                ) : (
                  <EmptyState message="No registration-open tournaments found." />
                )}
              </div>

              {activeMatchTournamentId && (
                (() => {
                  const currentTournament = tournaments.find((t) => t.id === activeMatchTournamentId);
                  if (!currentTournament) return null;
                  return (
                    <div className="space-y-6">
                      {/* Days Sub-tabs & Create Button */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-3">
                        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
                          {Array.from(
                            { length: currentTournament.numDays || 1 },
                            (_, i) => i + 1
                          ).map((day) => {
                            const isActive = activeMatchDay === day;
                            return (
                              <button
                                key={day}
                                type="button"
                                onClick={() => setActiveMatchDay(day)}
                                className={cn(
                                  "relative block px-4 py-3 text-sm font-medium transition-all duration-300 cursor-pointer",
                                  isActive
                                    ? "text-text-primary font-semibold"
                                    : "text-text-primary/60 hover:text-text-primary/95"
                                )}
                              >
                                Day {day}
                                <span
                                  className={cn(
                                    "absolute bottom-0 left-4 right-4 h-0.5 rounded-full bg-accent transition-all duration-300 origin-center",
                                    isActive ? "opacity-100 scale-x-100" : "opacity-0 scale-x-0"
                                  )}
                                />
                              </button>
                            );
                          })}
                        </div>
                        <Button
                          onClick={() => {
                            setEditingMatchId(null);
                            setNewMatchTitle("");
                            setNewMatchRoomId("");
                            setNewMatchRoomPassword("");
                            setSelectedGroups(["Group A"]);
                            const today = new Date();
                            const datePartToday = today.toISOString().split("T")[0];
                            setNewMatchDateTime(`${datePartToday}T20:00`);
                            setIsMatchModalOpen(true);
                          }}
                          className="py-2 px-4 text-xs font-bold uppercase tracking-wider flex items-center gap-2"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h14" /><path d="M12 5v14" />
                          </svg>
                          Create Match
                        </Button>
                      </div>

                      {/* Matches List */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-bold text-text-primary uppercase tracking-tight">Scheduled Matches</h3>
                        {matches.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {matches.map((m) => (
                              <div key={m.id} className="bg-bg-secondary border border-border rounded-2xl p-5 shadow-md flex flex-col justify-between relative group">
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <span className="font-extrabold text-text-primary text-base">{m.title}</span>
                                    <span className="px-2.5 py-0.5 rounded bg-accent/15 border border-accent/25 text-[10px] font-bold text-accent uppercase tracking-wider">{m.map}</span>
                                  </div>
                                  <div className="space-y-1 text-xs text-text-primary/60">
                                    <div>Date: <span className="font-semibold text-text-primary">{m.date}</span></div>
                                    <div>Time: <span className="font-semibold text-text-primary">{m.time}</span></div>
                                    <div>Groups: <span className="font-semibold text-accent">{m.groups?.join(", ") || "None"}</span></div>
                                    {m.roomId && <div>Room ID: <span className="font-mono font-bold text-text-primary">{m.roomId}</span></div>}
                                    {m.roomPassword && <div>Password: <span className="font-mono font-bold text-text-primary">{m.roomPassword}</span></div>}
                                  </div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-border/40 flex justify-end gap-2">
                                  <button
                                    onClick={() => handleEditMatchClick(m)}
                                    className="px-2.5 py-1 rounded bg-white/5 border border-border text-xs font-semibold text-text-primary/70 hover:text-text-primary hover:bg-white/10 transition-all cursor-pointer"
                                  >
                                    Edit Match
                                  </button>
                                  <button
                                    onClick={() => handleDeleteMatch(m.id, m.title)}
                                    className="px-2.5 py-1 rounded bg-red-500/10 border border-red-500/30 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-all cursor-pointer"
                                  >
                                    Delete Match
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <EmptyState message={`No matches scheduled for Day ${activeMatchDay} yet.`} />
                        )}
                      </div>
                    </div>
                  );
                })())}
            </div>
          ) : activeTab === "reviews" ? (
            <div className="space-y-8 max-w-7xl mx-auto animate-fade-in-up">
              {/* Status filter */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-3">
                <h3 className="text-lg font-bold text-text-primary uppercase tracking-tight">Player Reviews</h3>
                <div className="flex items-center gap-1 overflow-x-auto">
                  {[
                    { id: "all", label: "All" },
                    { id: "pending", label: "Pending" },
                    { id: "approved", label: "Approved" },
                    { id: "rejected", label: "Rejected" },
                  ].map((f) => {
                    const isActive = reviewsStatusFilter === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setReviewsStatusFilter(f.id)}
                        className={cn(
                          "relative block px-4 py-2.5 text-sm font-medium transition-all duration-300 cursor-pointer",
                          isActive
                            ? "text-text-primary font-semibold"
                            : "text-text-primary/60 hover:text-text-primary/95"
                        )}
                      >
                        {f.label}
                        <span
                          className={cn(
                            "absolute bottom-0 left-4 right-4 h-0.5 rounded-full bg-accent transition-all duration-300 origin-center",
                            isActive ? "opacity-100 scale-x-100" : "opacity-0 scale-x-0"
                          )}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              {reviews.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {reviews.map((review) => (
                    <div key={review.id} className="bg-bg-secondary border border-border rounded-2xl p-5 shadow-md flex flex-col justify-between relative group">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent text-sm font-extrabold">
                              {(review.name || "E").slice(0, 1).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <span className="block font-extrabold text-text-primary text-sm truncate">{review.name}</span>
                              <span className="block text-[11px] text-text-primary/50 truncate">{review.tournament}</span>
                            </div>
                          </div>
                          <span
                            className={cn(
                              "px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0",
                              review.status === "approved"
                                ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                                : review.status === "rejected"
                                ? "bg-red-500/10 border border-red-500/30 text-red-400"
                                : "bg-amber-500/10 border border-amber-500/30 text-amber-400"
                            )}
                          >
                            {review.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-amber-400">
                          {Array.from({ length: 5 }, (_, i) => (
                            <svg key={i} xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill={i < review.rating ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                          ))}
                          <span className="ml-2 text-xs font-semibold text-text-primary/50">{review.helpful} helpful</span>
                        </div>
                        <p className="text-sm leading-relaxed text-text-primary/70">{review.text}</p>
                        <div className="text-[11px] text-text-primary/40">
                          Submitted {new Date(review.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-border/40 flex justify-end gap-2">
                        {review.status !== "approved" && (
                          <button
                            onClick={() => handleReviewStatus(review, "approved")}
                            className="px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer"
                          >
                            Approve
                          </button>
                        )}
                        {review.status !== "rejected" && (
                          <button
                            onClick={() => handleReviewStatus(review, "rejected")}
                            className="px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-xs font-semibold text-amber-400 hover:bg-amber-500/20 transition-all cursor-pointer"
                          >
                            Reject
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteReview(review)}
                          className="px-2.5 py-1 rounded bg-red-500/10 border border-red-500/30 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-all cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState message="No reviews found." />
              )}
            </div>
          ) : activeTab === "settings" ? (
            <div className="max-w-xl animate-fade-in-up space-y-6">
              <div>
                <h3 className="text-lg font-bold text-text-primary">Admin Password Settings</h3>
                <p className="text-xs text-text-primary/40 mt-1">
                  Update the credentials used to access the administrator panel.
                </p>
              </div>

              {changePasswordError && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 font-semibold animate-fade-in">
                  {changePasswordError}
                </div>
              )}

              {changePasswordSuccess && (
                <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-xs text-green-400 font-semibold animate-fade-in">
                  {changePasswordSuccess}
                </div>
              )}

              <form onSubmit={handleChangePasswordSubmit} className="space-y-4 max-w-md">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-primary/50 uppercase tracking-wider block">
                    Current Password *
                  </label>
                    <input
                      type="password"
                      required
                      placeholder="Enter current password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full bg-bg-primary border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-primary/50 uppercase tracking-wider block">
                      New Password *
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-bg-primary border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-primary/50 uppercase tracking-wider block">
                      Confirm New Password *
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Confirm new password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      className="w-full bg-bg-primary border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent"
                    />
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={isChangingPassword}
                      className="w-full py-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
                    >
                      {isChangingPassword ? (
                        <>
                          <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                          Updating Password...
                        </>
                      ) : (
                        "Update Password"
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            ) : (
            <div className="h-full flex flex-col items-center justify-center max-w-md mx-auto text-center space-y-4 animate-fade-in-up">
              <div className="w-16 h-16 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-text-primary capitalize">
                {activeTab} Management
              </h3>
              <p className="text-sm text-text-primary/50">
                This tab is under development. Admin management capability for {activeTab} will be available soon.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Create/Edit Match Modal */}
      <Modal
        isOpen={isMatchModalOpen}
        onClose={handleCancelEditMatch}
        title={editingMatchId ? "Edit Match" : "Create Match"}
        hideHeader={false}
      >
        <form onSubmit={handleCreateMatchSubmit} className="p-6 space-y-5">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-text-primary/50 uppercase tracking-wider block">Match Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Match 1 - Erangel"
              value={newMatchTitle}
              onChange={(e) => setNewMatchTitle(e.target.value)}
              className="w-full bg-bg-primary border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-primary/50 uppercase tracking-wider block">Select Map *</label>
              <select
                value={newMatchMap}
                onChange={(e) => setNewMatchMap(e.target.value)}
                className="w-full bg-bg-primary border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent"
              >
                {["Erangel", "Miramar", "Sanhok", "Vikendi", "Nusa", "Karakin", "Rondo"].map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-primary/50 uppercase tracking-wider block">Start Date & Time *</label>
              <input
                type="datetime-local"
                required
                value={newMatchDateTime}
                onChange={(e) => setNewMatchDateTime(e.target.value)}
                className="w-full bg-bg-primary border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent [&::-webkit-calendar-picker-indicator]:invert"
              />
            </div>
          </div>

          {/* Target Groups */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-text-primary/50 uppercase tracking-wider block">Target Groups *</label>
              {selectedGroups.length < groupsList.length && (
                <button
                  type="button"
                  onClick={() => {
                    const nextGroup = groupsList.find((g) => !selectedGroups.includes(g));
                    if (nextGroup) {
                      setSelectedGroups([...selectedGroups, nextGroup]);
                    }
                  }}
                  className="text-accent hover:text-accent/80 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14" /><path d="M12 5v14" />
                  </svg>
                  Add Group
                </button>
              )}
            </div>
            <div className="space-y-2">
              {selectedGroups.map((selectedGroup, index) => {
                const availableOptions = groupsList.filter((g) => g === selectedGroup || !selectedGroups.includes(g));
                return (
                  <div key={index} className="flex items-center gap-2">
                    <select
                      value={selectedGroup}
                      onChange={(e) => {
                        const newVal = e.target.value;
                        setSelectedGroups((prev) => prev.map((item, i) => i === index ? newVal : item));
                      }}
                      className="flex-1 bg-bg-primary border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent"
                    >
                      {availableOptions.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                    {selectedGroups.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedGroups((prev) => prev.filter((_, i) => i !== index));
                        }}
                        className="p-2.5 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10 hover:border-red-500/40 transition-all cursor-pointer"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                        </svg>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-primary/50 uppercase tracking-wider block">Room ID (Optional)</label>
              <input
                type="text"
                placeholder="e.g. 1234567"
                value={newMatchRoomId}
                onChange={(e) => setNewMatchRoomId(e.target.value)}
                className="w-full bg-bg-primary border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-primary/50 uppercase tracking-wider block">Room Password (Optional)</label>
              <input
                type="text"
                placeholder="e.g. epix123"
                value={newMatchRoomPassword}
                onChange={(e) => setNewMatchRoomPassword(e.target.value)}
                className="w-full bg-bg-primary border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border/40 mt-6">
            <Button
              type="button"
              variant="secondary"
              onClick={handleCancelEditMatch}
              className="py-2.5 px-5"
            >
              Cancel
            </Button>
            <Button type="submit" className="py-2.5 px-6">
              {editingMatchId ? "Save Changes" : "Create Match"}
            </Button>
          </div>
        </form>
      </Modal>

      <TournamentModal
        tournament={selectedTournament}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />

      <AddTournamentModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingTournament(null);
        }}
        onSubmit={handleCreateTournament}
        initialData={editingTournament}
      />

      {/* Receipt Lightbox Modal */}
      {expandedReceipt && (
        <Modal
          isOpen={!!expandedReceipt}
          onClose={() => setExpandedReceipt(null)}
          title="Payment Receipt Verification"
          width={650}
        >
          <div className="p-4 flex flex-col items-center gap-4 bg-bg-secondary">
            <div className="relative w-full max-h-[70vh] overflow-auto rounded-lg border border-border bg-bg-primary/50 flex justify-center p-2">
              <img
                src={expandedReceipt}
                alt="Full receipt"
                className="max-w-full max-h-[60vh] object-contain rounded-md animate-fade-in-up"
              />
            </div>
            <Button onClick={() => setExpandedReceipt(null)} variant="secondary" className="px-5">
              Close Preview
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
