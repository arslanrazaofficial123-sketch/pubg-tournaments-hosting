"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getTournaments, createTournament, deleteTournament, updateTournament, fetchAllRegistrations, updateRegistrationStatus, eliminateRegistration, updateRegistrationStats, type Registration } from "@/services/api/tournaments";
import { fetchMatches, createMatch, deleteMatch, updateMatch } from "@/services/api/matches";
import { getAdminReviews, updateReviewStatus, deleteReview } from "@/services/api/reviews";
import type { Review } from "@/types/review";
import { fetchAllUsers, deleteAccount, verifyAdminPassword, verifyPartnerPassword, changeAdminPassword, changePartnerPassword } from "@/services/api/auth";
import { fetchDatabaseStats, type DatabaseStats, type DatabaseCollectionStats } from "@/services/api/admin";
import { TournamentModal } from "@/features/tournaments/components/TournamentModal";
import { AddTournamentModal } from "@/features/tournaments/components/AddTournamentModal";
import { AdminWalletPanel } from "@/features/wallet/components/AdminWalletPanel";
import type { Tournament } from "@/types/tournament";
import type { UserProfile } from "@/types/auth";
import { Button, Modal, useAlert } from "@/components/ui";
import { ApiError } from "@/services/api/client";
import { cn } from "@/lib/utils";
import { Trophy, Users, FileText, LayoutGrid, Calendar, BarChart3, Settings, MessageSquare, LayoutDashboard, Star, Wallet, Database, ShoppingBag, Trash2 } from "lucide-react";
import { AdminShopOrdersPanel } from "@/features/shop/components/AdminShopOrdersPanel";

type ActiveTab = "overview" | "tournaments" | "users" | "registrations" | "groups" | "matches" | "settings" | "leaderboards" | "reviews" | "wallet" | "shop-orders" | "deletion-requests";

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="admin-empty flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/20 to-transparent text-accent border border-accent/20">
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
  const [adminRole, setAdminRole] = useState<"admin" | "partner">("admin");
  const [loginMode, setLoginMode] = useState<"admin" | "partner">("admin");
  const [adminPasswordInput, setAdminPasswordInput] = useState("");
  const [partnerPasswordInput, setPartnerPasswordInput] = useState("");
  const [adminAuthError, setAdminAuthError] = useState("");
  const [isVerifyingAdmin, setIsVerifyingAdmin] = useState(false);

  useEffect(() => {
    // Restore admin/partner session on refresh so the panel stays open
    const isAuthenticated = sessionStorage.getItem("admin_authenticated") === "true";
    if (isAuthenticated) {
      const storedRole = sessionStorage.getItem("admin_role") === "partner" ? "partner" : "admin";
      setAdminRole(storedRole);
      if (storedRole === "partner") {
        setActiveTab("registrations");
      }
      setIsAdminAuthenticated(true);
    } else {
      sessionStorage.removeItem("admin_authenticated");
      sessionStorage.removeItem("admin_token");
      sessionStorage.removeItem("admin_role");
      setIsAdminAuthenticated(false);
    }
  }, []);

  const handleAdminAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminAuthError("");
    setIsVerifyingAdmin(true);
    try {
      if (loginMode === "partner") {
        const success = await verifyPartnerPassword(partnerPasswordInput);
        if (success) {
          sessionStorage.setItem("admin_authenticated", "true");
          setAdminRole("partner");
          setActiveTab("registrations");
          setIsAdminAuthenticated(true);
        } else {
          setAdminAuthError("Incorrect partner password.");
        }
      } else {
        const success = await verifyAdminPassword(adminPasswordInput);
        if (success) {
          sessionStorage.setItem("admin_authenticated", "true");
          setAdminRole("admin");
          setIsAdminAuthenticated(true);
        } else {
          setAdminAuthError("Incorrect admin password.");
        }
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
    sessionStorage.removeItem("admin_role");
    setIsAdminAuthenticated(false);
    setActiveTab("overview");
  };

  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");

  useEffect(() => {
    if (isAdminAuthenticated && adminRole === "partner" && !["registrations", "groups", "matches", "users"].includes(activeTab)) {
      setActiveTab("registrations");
    }
  }, [isAdminAuthenticated, adminRole, activeTab]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [activeRegTournamentId, setActiveRegTournamentId] = useState<string | null>(null);
  const [activeGroupTournamentId, setActiveGroupTournamentId] = useState<string | null>(null);
  const [activeMatchTournamentId, setActiveMatchTournamentId] = useState<string | null>(null);
  const [activeMatchDay, setActiveMatchDay] = useState<number>(1);
  const [matches, setMatches] = useState<any[]>([]);
  const [allMatches, setAllMatches] = useState<any[]>([]);
  const [dbStats, setDbStats] = useState<DatabaseStats | null>(null);
  const [dbStatsError, setDbStatsError] = useState(false);
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

  // States for changing partner password in Settings
  const [partnerCurrentPassword, setPartnerCurrentPassword] = useState("");
  const [partnerNewPassword, setPartnerNewPassword] = useState("");
  const [partnerConfirmNewPassword, setPartnerConfirmNewPassword] = useState("");
  const [isChangingPartnerPassword, setIsChangingPartnerPassword] = useState(false);
  const [changePartnerPasswordError, setChangePartnerPasswordError] = useState("");
  const [changePartnerPasswordSuccess, setChangePartnerPasswordSuccess] = useState("");

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

  const handleChangePartnerPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePartnerPasswordError("");
    setChangePartnerPasswordSuccess("");

    if (!partnerCurrentPassword || !partnerNewPassword || !partnerConfirmNewPassword) {
      setChangePartnerPasswordError("All fields are required.");
      return;
    }

    if (partnerNewPassword !== partnerConfirmNewPassword) {
      setChangePartnerPasswordError("New password and confirm password do not match.");
      return;
    }

    setIsChangingPartnerPassword(true);
    try {
      const res = await changePartnerPassword(partnerCurrentPassword, partnerNewPassword);
      if (res.success) {
        setChangePartnerPasswordSuccess(res.message || "Partner password updated successfully.");
        setPartnerCurrentPassword("");
        setPartnerNewPassword("");
        setPartnerConfirmNewPassword("");
      } else {
        setChangePartnerPasswordError(res.message || "Failed to change partner password.");
      }
    } catch (err: any) {
      setChangePartnerPasswordError(err?.message || "Failed to change partner password. Server error.");
    } finally {
      setIsChangingPartnerPassword(false);
    }
  };

  const currentMatchTournament = tournaments.find((t) => t.id === activeMatchTournamentId);
  const groupsList = currentMatchTournament
    ? Array.from(
      { length: currentMatchTournament.numGroups || 1 },
      (_, i) => `Group ${String.fromCharCode(65 + i)}`
    )
    : ["Group A"];

  const [expandedImage, setExpandedImage] = useState<{ src: string; title: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!isAdminAuthenticated) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    async function loadData() {
      try {
        const isPartner = sessionStorage.getItem("admin_role") === "partner";
        const [tourns, regList, usrList, allMatchList] = await Promise.all([
          getTournaments(),
          fetchAllRegistrations(),
          fetchAllUsers(),
          fetchMatches(),
        ]);
        setTournaments(tourns);
        setRegistrations(regList);
        setUsers(usrList);
        setAllMatches(allMatchList);

        if (!isPartner) {
          const [reviewList, stats] = await Promise.all([
            getAdminReviews(),
            fetchDatabaseStats(),
          ]);
          setReviews(reviewList);
          setDbStats(stats);
          setDbStatsError(stats === null);
        } else {
          setReviews([]);
          setDbStats(null);
          setDbStatsError(false);
        }

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
        if (err instanceof ApiError && err.status === 401) {
          sessionStorage.removeItem("admin_authenticated");
          sessionStorage.removeItem("admin_token");
          sessionStorage.removeItem("admin_role");
          setIsAdminAuthenticated(false);
        }
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [isAdminAuthenticated, adminRole]);

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

  const [deletionRequests, setDeletionRequests] = useState<any[]>([]);
  const [deletionStatusFilter, setDeletionStatusFilter] = useState<string>("all");

  useEffect(() => {
    if (activeTab !== "deletion-requests") return;
    async function loadDeletionRequests() {
      try {
        const query = deletionStatusFilter !== "all" ? `?status=${deletionStatusFilter}` : "";
        const res = await fetch(`/api/data-deletion/admin${query}`, {
          headers: { Authorization: `Bearer ${sessionStorage.getItem("admin_token") || ""}` },
        });
        const data = await res.json();
        setDeletionRequests(data.requests || []);
      } catch (err) {
        console.error("Failed to fetch deletion requests:", err);
      }
    }
    loadDeletionRequests();
  }, [activeTab, deletionStatusFilter]);

  const handleUpdateDeletionStatus = async (id: string, status: string, adminNote?: string) => {
    try {
      const res = await fetch(`/api/data-deletion/admin/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionStorage.getItem("admin_token") || ""}`,
        },
        body: JSON.stringify({ status, adminNote }),
      });
      if (!res.ok) throw new Error("Failed");
      const query = deletionStatusFilter !== "all" ? `?status=${deletionStatusFilter}` : "";
      const listRes = await fetch(`/api/data-deletion/admin${query}`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem("admin_token") || ""}` },
      });
      const data = await listRes.json();
      setDeletionRequests(data.requests || []);
      showAlert(`Request ${status} successfully.`, "success");
    } catch (err) {
      console.error("Failed to update deletion request:", err);
      showAlert("Failed to update request status.", "error");
    }
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

  // Overview / website statistics
  const regOpenCount = tournaments.filter((t) => t.status === "registration_open").length;
  const approvedRegs = registrations.filter((r) => r.status === "approved").length;
  const pendingRegs = registrations.filter((r) => r.status === "pending").length;
  const rejectedRegs = registrations.filter((r) => r.status === "rejected").length;
  const totalPlayers = users.length;
  const totalMatchCount = allMatches.length;

  const approvedReviews = reviews.filter((r) => r.status === "approved").length;
  const pendingReviews = reviews.filter((r) => r.status === "pending").length;
  const rejectedReviews = reviews.filter((r) => r.status === "rejected").length;
  const avgRating = approvedReviews > 0
    ? (
      reviews
        .filter((r) => r.status === "approved")
        .reduce((acc, r) => acc + (r.rating || 0), 0) / approvedReviews
    ).toFixed(1)
    : "0.0";

  const totalSlots = tournaments.reduce((acc, t) => acc + (Number(t.maxTeams) || 0), 0);
  const filledSlots = tournaments.reduce((acc, t) => acc + (Number(t.registeredTeams) || 0), 0);
  const fillRate = totalSlots > 0 ? Math.min(100, Math.round((filledSlots / totalSlots) * 100)) : 0;

  const parseMoney = (s: string) => {
    if (!s || /free/i.test(s)) return 0;
    const num = s.replace(/[^0-9.]/g, "");
    return num ? Number(num) : 0;
  };
  const totalPrizePool = tournaments.reduce((acc, t) => acc + parseMoney(t.prizePool), 0);
  const totalEntryFees = registrations.reduce((acc, r) => acc + (r.status === "approved" ? parseMoney(tournaments.find((t) => t.id === r.tournamentId)?.registrationFee || "") : 0), 0);

  const topTeams = [...registrations]
    .filter((r) => r.status === "approved" && (Number(r.totalPoints) || 0) > 0)
    .sort((a, b) => (Number(b.totalPoints) || 0) - (Number(a.totalPoints) || 0))
    .slice(0, 5);

  const recentRegs = [...registrations]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  const recentReviews = [...reviews]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);

  const teamsPerTournament = tournaments.map((t) => ({
    ...t,
    pct: t.maxTeams > 0 ? Math.min(100, Math.round((Number(t.registeredTeams) / Number(t.maxTeams)) * 100)) : 0,
  }));

  const tournamentStatuses = [
    { label: "Registration Open", val: regOpenCount, color: "bg-emerald-500" },
    { label: "Upcoming", val: upcomingCount, color: "bg-sky-500" },
    { label: "Ongoing", val: ongoingCount, color: "bg-accent" },
    { label: "Ended", val: endedCount, color: "bg-text-primary/40" },
  ];
  const registrationStatuses = [
    { label: "Approved", val: approvedRegs, color: "bg-emerald-500" },
    { label: "Pending", val: pendingRegs, color: "bg-amber-500" },
    { label: "Rejected", val: rejectedRegs, color: "bg-red-500" },
  ];
  const reviewStatuses = [
    { label: "Approved", val: approvedReviews, color: "bg-emerald-500" },
    { label: "Pending", val: pendingReviews, color: "bg-amber-500" },
    { label: "Rejected", val: rejectedReviews, color: "bg-red-500" },
  ];

  if (!isAdminAuthenticated) {
    return (
      <div className="min-h-screen bg-bg-primary text-text-primary flex items-center justify-center p-4 admin-shell">
        <div className="w-full max-w-md bg-bg-secondary/80 backdrop-blur-xl rounded-2xl border border-border p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute right-0 top-0 h-40 w-40 translate-x-10 -translate-y-10 rounded-full bg-accent/10 blur-3xl" />
          <div className="absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-accent/5 blur-3xl" />

          <div className="relative flex flex-col items-center text-center space-y-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-accent/30 blur-xl" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/25 to-accent/5 text-accent border border-accent/30 shadow-lg shadow-accent/20">
                <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
            </div>
            <h1 className="text-xl font-black uppercase tracking-tight admin-section-title">Admin Authentication</h1>
            <p className="text-xs text-text-primary/50 max-w-xs">
              This area is restricted. Please enter the password to access the panel.
            </p>
          </div>

          <div className="relative flex rounded-xl border border-border bg-bg-primary/60 p-1">
            {([
              { id: "admin", label: "Admin", desc: "Full access" },
              { id: "partner", label: "Partner", desc: "Limited access" },
            ] as const).map((m) => {
              const isActive = loginMode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setLoginMode(m.id);
                    setAdminAuthError("");
                  }}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-center transition-all duration-200 cursor-pointer ${isActive
                    ? "bg-gradient-to-r from-accent to-accent-hover text-bg-primary shadow-lg shadow-accent/30 scale-[1.02]"
                    : "text-text-primary/60 hover:text-text-primary hover:bg-white/5"
                    }`}
                >
                  <span className="block text-sm font-bold">{m.label}</span>
                  <span className={`block text-[10px] font-semibold uppercase tracking-wider ${isActive ? "text-bg-primary/70" : "text-text-primary/30"}`}>
                    {m.desc}
                  </span>
                </button>
              );
            })}
          </div>

          <form onSubmit={handleAdminAuthSubmit} className="relative space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-text-primary/75">
                {loginMode === "partner" ? "Partner Password" : "Admin Password"}
              </label>
              <input
                type="password"
                placeholder="Enter password..."
                value={loginMode === "partner" ? partnerPasswordInput : adminPasswordInput}
                onChange={(e) =>
                  loginMode === "partner"
                    ? setPartnerPasswordInput(e.target.value)
                    : setAdminPasswordInput(e.target.value)
                }
                className="w-full bg-bg-primary/80 border border-border rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all font-semibold"
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

            <Button type="submit" fullWidth disabled={isVerifyingAdmin} className="py-3 admin-btn-primary">
              {isVerifyingAdmin ? "Verifying..." : loginMode === "partner" ? "Access Partner Panel" : "Access Panel"}
            </Button>
          </form>

          <div className="relative pt-2 text-center">
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

  const navItems = [
    {
      id: "overview",
      label: "Overview",
      icon: <LayoutDashboard className="w-5 h-5 shrink-0" />,
      partnerAccess: false,
    },
    {
      id: "tournaments",
      label: "Tournaments",
      icon: <Trophy className="w-5 h-5 shrink-0" />,
      partnerAccess: false,
    },
    {
      id: "users",
      label: "Users",
      icon: <Users className="w-5 h-5 shrink-0" />,
      partnerAccess: true,
    },
    {
      id: "registrations",
      label: "Registrations",
      icon: <FileText className="w-5 h-5 shrink-0" />,
      partnerAccess: true,
    },
    {
      id: "groups",
      label: "Groups",
      icon: <LayoutGrid className="w-5 h-5 shrink-0" />,
      partnerAccess: true,
    },
    {
      id: "matches",
      label: "Matches",
      icon: <Calendar className="w-5 h-5 shrink-0" />,
      partnerAccess: true,
    },
    {
      id: "reviews",
      label: "Reviews",
      icon: <MessageSquare className="w-5 h-5 shrink-0" />,
      partnerAccess: false,
    },
    {
      id: "leaderboards",
      label: "Leaderboards",
      icon: <BarChart3 className="w-5 h-5 shrink-0" />,
      partnerAccess: false,
    },
    {
      id: "wallet",
      label: "Wallet",
      icon: <Wallet className="w-5 h-5 shrink-0" />,
      partnerAccess: false,
    },
    {
      id: "shop-orders",
      label: "Shop Orders",
      icon: <ShoppingBag className="w-5 h-5 shrink-0" />,
      partnerAccess: false,
    },
    {
      id: "deletion-requests",
      label: "Deletion Requests",
      icon: <Trash2 className="w-5 h-5 shrink-0" />,
      partnerAccess: false,
    },
    {
      id: "settings",
      label: "Settings",
      icon: <Settings className="w-5 h-5 shrink-0" />,
      partnerAccess: false,
    },
  ].filter((tab) => adminRole === "admin" || tab.partnerAccess);

  const bottomBarIds =
    adminRole === "partner"
      ? ["users", "registrations", "groups", "matches"]
      : ["overview", "tournaments", "registrations", "matches", "groups"];

  const bottomBarItems = bottomBarIds
    .map((id) => navItems.find((tab) => tab.id === id))
    .filter((tab): tab is (typeof navItems)[number] => Boolean(tab));

  return (
    <div className="flex flex-col lg:flex-row h-dvh bg-bg-primary text-text-primary overflow-hidden admin-shell">
      {/* Sidebar */}
      <aside
        className={`admin-sidebar border-r border-border flex-col justify-between shrink-0 transition-all duration-300 hidden lg:flex ${isSidebarCollapsed ? "w-20" : "w-64"
          }`}
      >
        <div className="flex flex-col">
          {/* Logo / Branding */}
          <div className="p-4 border-b border-border flex items-center gap-3 overflow-hidden h-20 shrink-0 relative">
            <div className="absolute inset-0 bg-gradient-to-b from-accent/10 to-transparent opacity-60" />
            <img
              src="/images/logo.png"
              alt="Logo"
              className="w-10 h-10 object-contain shrink-0 relative"
            />
            {!isSidebarCollapsed && (
              <div className="flex flex-col min-w-0 relative">
                <h1 className="text-md font-bold tracking-wider text-text-primary uppercase truncate">
                  EPIX Esports
                </h1>
                <span className="text-[10px] text-accent/70 uppercase tracking-widest font-semibold">
                  {adminRole === "partner" ? "Partner Portal" : "Admin Portal"}
                </span>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            {navItems.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ActiveTab)}
                className={`admin-nav-item w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer ${isSidebarCollapsed ? "justify-center" : ""
                  } ${activeTab === tab.id
                    ? "admin-nav-item-active"
                    : "text-text-primary/70 hover:text-text-primary"
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
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-white/[0.02] text-xs font-semibold text-text-primary/70 hover:border-accent hover:text-accent transition-all hover:bg-accent/5"
            title={isSidebarCollapsed ? "Back to Site" : undefined}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            {!isSidebarCollapsed && <span>Back to Site</span>}
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-red-500/30 bg-red-500/5 text-xs font-semibold text-red-400 hover:bg-red-500/10 hover:border-red-500/50 hover:shadow-lg hover:shadow-red-500/10 transition-all cursor-pointer"
            title={isSidebarCollapsed ? "Logout" : undefined}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {!isSidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <header className="lg:hidden shrink-0 h-16 border-b border-border flex items-center justify-between px-4 bg-bg-secondary/80 backdrop-blur-xl relative z-30">
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setIsMobileNavOpen(true)}
            className="p-2 rounded-lg border border-border bg-white/[0.02] hover:bg-white/5 hover:border-accent text-text-primary transition-all cursor-pointer flex items-center justify-center shrink-0"
            title="Open Menu"
            aria-label="Open Menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex flex-col min-w-0">
            <h2 className="text-lg font-black capitalize admin-section-title truncate">
              {activeTab === "overview" ? "Website Overview" : `${activeTab} Management`}
            </h2>
            <span className="text-[10px] text-text-primary/40 flex items-center gap-1">
              <span className="text-accent font-semibold">Dashboard</span>
              <span className="text-text-primary/25">/</span>
              <span className="capitalize truncate">{activeTab}</span>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/10 border border-accent/25 text-[10px] font-bold text-accent shrink-0">
          <span className="admin-status-dot bg-accent" />
          {adminRole === "partner" ? "Partner" : "Admin"}
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      <div
        className={`lg:hidden fixed inset-0 z-50 transition-all duration-300 ${isMobileNavOpen ? "pointer-events-auto" : "pointer-events-none"
          }`}
      >
        <div
          onClick={() => setIsMobileNavOpen(false)}
          className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isMobileNavOpen ? "opacity-100" : "opacity-0"
            }`}
        />
        <div
          className={`absolute left-0 top-0 bottom-0 w-72 max-w-[85vw] bg-bg-secondary border-r border-border flex flex-col transition-transform duration-300 ${isMobileNavOpen ? "translate-x-0" : "-translate-x-full"
            }`}
        >
          <div className="p-4 border-b border-border flex items-center gap-3 h-16 shrink-0 relative">
            <div className="absolute inset-0 bg-gradient-to-b from-accent/10 to-transparent opacity-60" />
            <img src="/images/logo.png" alt="Logo" className="w-9 h-9 object-contain shrink-0 relative" />
            <div className="flex flex-col min-w-0 relative flex-1">
              <h1 className="text-sm font-bold tracking-wider text-text-primary uppercase truncate">EPIX Esports</h1>
              <span className="text-[10px] text-accent/70 uppercase tracking-widest font-semibold">
                {adminRole === "partner" ? "Partner Portal" : "Admin Portal"}
              </span>
            </div>
            <button
              onClick={() => setIsMobileNavOpen(false)}
              className="p-1.5 rounded-lg border border-border bg-white/[0.02] hover:bg-white/5 hover:border-accent text-text-primary transition-all cursor-pointer relative"
              aria-label="Close Menu"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto p-4 space-y-1.5 modal-scrollbar">
            {navItems.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as ActiveTab);
                  setIsMobileNavOpen(false);
                }}
                className={`admin-nav-item w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer ${activeTab === tab.id
                  ? "admin-nav-item-active"
                  : "text-text-primary/70 hover:text-text-primary"
                  }`}
              >
                {tab.icon}
                <span className="truncate">{tab.label}</span>
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-border space-y-2">
            <Link
              href="/"
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-white/[0.02] text-xs font-semibold text-text-primary/70 hover:border-accent hover:text-accent transition-all hover:bg-accent/5"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span>Back to Site</span>
            </Link>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-red-500/30 bg-red-500/5 text-xs font-semibold text-red-400 hover:bg-red-500/10 hover:border-red-500/50 hover:shadow-lg hover:shadow-red-500/10 transition-all cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-bg-secondary/90 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
        <div className="grid" style={{ gridTemplateColumns: `repeat(${bottomBarItems.length}, minmax(0, 1fr))` }}>
          {bottomBarItems.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ActiveTab)}
                className={`flex flex-col items-center justify-center gap-0.5 py-2.5 px-1 transition-all duration-200 cursor-pointer ${isActive ? "text-accent" : "text-text-primary/50 hover:text-text-primary"
                  }`}
              >
                <span className={`flex items-center justify-center w-10 h-7 rounded-full transition-all duration-200 ${isActive ? "bg-accent/15" : ""}`}>
                  {tab.icon}
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wide leading-none truncate max-w-full">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header (desktop) */}
        <header className="h-20 border-b border-border items-center justify-between px-8 bg-bg-secondary/60 backdrop-blur-xl relative hidden lg:flex">
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
          <div className="flex items-center gap-4">
            {/* Toggle Sidebar Button */}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-2 rounded-lg border border-border bg-white/[0.02] hover:bg-white/5 hover:border-accent text-text-primary transition-all cursor-pointer flex items-center justify-center hover:shadow-lg hover:shadow-accent/10"
              title="Toggle Sidebar"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="flex flex-col">
              <h2 className="text-xl font-black capitalize admin-section-title">
                {activeTab === "overview" ? "Website Overview" : `${activeTab} Management`}
              </h2>
              <span className="text-xs text-text-primary/40 mt-0.5 flex items-center gap-1.5">
                <span className="text-accent font-semibold">Dashboard</span>
                <span className="text-text-primary/25">/</span>
                <span className="capitalize">{activeTab}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/25 text-xs font-bold text-accent shadow-lg shadow-accent/10">
              <span className="admin-status-dot bg-accent" />
              {adminRole === "partner" ? "Partner Access" : "Full Admin Access"}
            </div>
          </div>
        </header>

        {/* Content Pane */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-28 lg:pb-8 modal-scrollbar">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="w-8 h-8 rounded-full border-4 border-accent border-t-transparent animate-spin" />
            </div>
          ) : activeTab === "overview" ? (
            <div className="space-y-8 max-w-7xl mx-auto animate-fade-in-up">
              {/* KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                {[
                  { label: "Total Players", val: totalPlayers, icon: <Users className="w-5 h-5" />, accent: "text-accent", chip: "from-accent/30 to-accent/5" },
                  { label: "Total Tournaments", val: totalTournaments, icon: <Trophy className="w-5 h-5" />, accent: "text-accent", chip: "from-accent/30 to-accent/5" },
                  { label: "Total Registrations", val: registrations.length, icon: <FileText className="w-5 h-5" />, accent: "text-accent", chip: "from-accent/30 to-accent/5" },
                  { label: "Approved Teams", val: approvedRegs, icon: <Users className="w-5 h-5" />, accent: "text-emerald-400", chip: "from-emerald-500/30 to-emerald-500/5" },
                  { label: "Pending Registrations", val: pendingRegs, icon: <FileText className="w-5 h-5" />, accent: "text-amber-400", chip: "from-amber-500/30 to-amber-500/5" },
                  { label: "Total Matches", val: totalMatchCount, icon: <Calendar className="w-5 h-5" />, accent: "text-accent", chip: "from-accent/30 to-accent/5" },
                  { label: "Reviews", val: reviews.length, icon: <Star className="w-5 h-5" />, accent: "text-amber-400", chip: "from-amber-500/30 to-amber-500/5" },
                  { label: "Avg Rating", val: avgRating, icon: <Star className="w-5 h-5" />, accent: "text-amber-400", chip: "from-amber-500/30 to-amber-500/5" },
                ].map((k, i) => (
                  <div key={i} className="admin-card admin-kpi p-5 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-text-primary/40 uppercase tracking-wider">
                        {k.label}
                      </span>
                      <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${k.chip} border border-accent/20 ${k.accent}`}>
                        {k.icon}
                      </div>
                    </div>
                    <span className={`text-3xl font-black ${k.accent}`}>
                      {k.val.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>

              {/* Slot fill + finances */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 admin-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-semibold text-text-primary/40 uppercase tracking-wider">Tournament Slots Filled</span>
                    <span className="text-sm font-black text-accent">{filledSlots.toLocaleString()} / {totalSlots.toLocaleString()}</span>
                  </div>
                  <div className="h-4 rounded-full bg-bg-primary/60 overflow-hidden border border-border/40">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-accent to-emerald-500 transition-all duration-700 relative"
                      style={{ width: `${fillRate}%` }}
                    >
                      <div className="absolute inset-0 bg-white/10" />
                    </div>
                  </div>
                  <div className="mt-2 text-right text-xs font-bold text-text-primary/40">
                    {fillRate}% capacity
                  </div>
                </div>
                <div className="admin-card admin-kpi p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="admin-kpi-icon flex h-8 w-8 items-center justify-center rounded-lg text-accent">
                      <Wallet className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold text-text-primary/40 uppercase tracking-wider">Total Prize Pool</span>
                  </div>
                  <span className="text-2xl font-black">PKR {totalPrizePool.toLocaleString()}</span>
                  <div className="mt-3 pt-3 border-t border-border/40 flex items-center justify-between text-xs text-text-primary/50">
                    <span>Entry fees collected</span>
                    <span className="font-bold text-emerald-400">PKR {totalEntryFees.toLocaleString()}</span>
                  </div>
                </div>
                <div className="admin-card admin-kpi p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="admin-kpi-icon flex h-8 w-8 items-center justify-center rounded-lg text-accent">
                      <Trophy className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold text-text-primary/40 uppercase tracking-wider">Tournaments Live</span>
                  </div>
                  <span className="text-2xl font-black">{regOpenCount + ongoingCount}</span>
                  <div className="mt-3 pt-3 border-t border-border/40 flex items-center justify-between text-xs text-text-primary/50">
                    <span>Open for registration</span>
                    <span className="font-bold text-emerald-400">{regOpenCount}</span>
                  </div>
                </div>
              </div>

              {/* Status breakdowns */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {[
                  { title: "Tournament Status", list: tournamentStatuses },
                  { title: "Registration Status", list: registrationStatuses },
                  { title: "Review Status", list: reviewStatuses },
                ].map((sec, i) => {
                  const maxVal = Math.max(1, ...sec.list.map((s) => s.val));
                  return (
                    <div key={i} className="admin-card admin-kpi p-5">
                      <h4 className="text-xs font-bold text-text-primary/50 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <span className="h-1 w-1 rounded-full bg-accent" />
                        {sec.title}
                      </h4>
                      <div className="space-y-3">
                        {sec.list.map((s) => (
                          <div key={s.label}>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="text-text-primary/70 font-medium">{s.label}</span>
                              <span className="font-bold text-text-primary">{s.val}</span>
                            </div>
                            <div className="h-2 rounded-full bg-bg-primary/60 overflow-hidden border border-border/30">
                              <div
                                className={`h-full rounded-full ${s.color} transition-all duration-700`}
                                style={{ width: `${(s.val / maxVal) * 100}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Tournaments by fill + leaderboard */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="admin-card overflow-hidden">
                  <div className="p-5 border-b border-border bg-gradient-to-r from-accent/10 to-transparent">
                    <h4 className="text-sm font-bold admin-section-title">Tournament Registration Fill</h4>
                  </div>
                  {teamsPerTournament.length > 0 ? (
                    <div className="p-5 space-y-4 max-h-80 overflow-y-auto modal-scrollbar">
                      {teamsPerTournament.map((t) => (
                        <div key={t.id}>
                          <div className="flex items-center justify-between text-xs mb-1 gap-3">
                            <span className="font-semibold text-text-primary/80 truncate">{t.title}</span>
                            <span className="text-text-primary/40 shrink-0">
                              {t.registeredTeams}/{t.maxTeams} teams
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-bg-primary/60 overflow-hidden border border-border/30">
                            <div className="h-full rounded-full bg-gradient-to-r from-accent to-accent-hover transition-all duration-700" style={{ width: `${t.pct}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState message="No tournaments found." />
                  )}
                </div>

                <div className="admin-card overflow-hidden">
                  <div className="p-5 border-b border-border bg-gradient-to-r from-accent/10 to-transparent">
                    <h4 className="text-sm font-bold admin-section-title">Top Teams by Points</h4>
                  </div>
                  {topTeams.length > 0 ? (
                    <div className="p-4 space-y-2">
                      {topTeams.map((r, idx) => {
                        const tourn = tournaments.find((t) => t.id === r.tournamentId);
                        return (
                          <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-border/40 hover:border-accent/30 transition-all">
                            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black ${idx === 0 ? "bg-gradient-to-br from-amber-400/30 to-amber-500/10 text-amber-400 border border-amber-400/30" : "bg-accent/10 text-accent border border-accent/20"}`}>
                              {idx + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <span className="block text-sm font-semibold text-text-primary truncate">{r.teamName || "Unnamed team"}</span>
                              <span className="block text-[11px] text-text-primary/40 truncate">{tourn?.title || "Tournament"}</span>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="block text-sm font-extrabold text-accent">{r.totalPoints} pts</span>
                              <span className="block text-[11px] text-text-primary/40">{r.kills || 0} kills</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <EmptyState message="No ranked teams yet." />
                  )}
                </div>
              </div>

              {/* Recent activity */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="admin-card overflow-hidden">
                  <div className="p-5 border-b border-border bg-gradient-to-r from-accent/10 to-transparent">
                    <h4 className="text-sm font-bold admin-section-title">Latest Registrations</h4>
                  </div>
                  {recentRegs.length > 0 ? (
                    <div className="p-4 space-y-2">
                      {recentRegs.map((r) => {
                        const tourn = tournaments.find((t) => t.id === r.tournamentId);
                        return (
                          <div key={r.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-all">
                            <div className="min-w-0">
                              <span className="block text-sm font-bold text-text-primary truncate">{r.teamName || "Unnamed team"}</span>
                              <span className="block text-[11px] text-text-primary/40 truncate">{tourn?.title || "Tournament"} · {new Date(r.createdAt).toLocaleDateString()}</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                              r.status === "approved" ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400" :
                              r.status === "rejected" ? "bg-red-500/10 border border-red-500/30 text-red-400" :
                              "bg-amber-500/10 border border-amber-500/30 text-amber-400"
                            }`}>
                              {r.status}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <EmptyState message="No registrations yet." />
                  )}
                </div>

                <div className="admin-card overflow-hidden">
                  <div className="p-5 border-b border-border bg-gradient-to-r from-accent/10 to-transparent">
                    <h4 className="text-sm font-bold admin-section-title">Latest Reviews</h4>
                  </div>
                  {recentReviews.length > 0 ? (
                    <div className="p-4 space-y-2">
                      {recentReviews.map((r) => (
                        <div key={r.id} className="flex items-start justify-between gap-3 p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-all">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-text-primary truncate">{r.name}</span>
                              <div className="flex items-center gap-0.5 text-amber-400 shrink-0">
                                {Array.from({ length: 5 }, (_, i) => (
                                  <svg key={i} xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill={i < r.rating ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                  </svg>
                                ))}
                              </div>
                            </div>
                            <p className="text-xs text-text-primary/60 truncate mt-0.5">{r.text}</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                            r.status === "approved" ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400" :
                            r.status === "rejected" ? "bg-red-500/10 border border-red-500/30 text-red-400" :
                            "bg-amber-500/10 border border-amber-500/30 text-amber-400"
                          }`}>
                            {r.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState message="No reviews yet." />
                  )}
                </div>
              </div>

              {/* Database Storage */}
              <div className="admin-card overflow-hidden">
                <div className="p-5 border-b border-border bg-gradient-to-r from-accent/10 to-transparent flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="admin-kpi-icon flex h-8 w-8 items-center justify-center rounded-lg text-accent">
                      <Database className="w-4 h-4" />
                    </div>
                    <h4 className="text-sm font-bold admin-section-title">Database Storage</h4>
                  </div>
                  <span className="text-xs font-bold text-text-primary/40 uppercase tracking-wider">
                    {dbStats ? dbStats.database : "MongoDB"}
                  </span>
                </div>
                <div className="p-5 space-y-5">
                  {!dbStats ? (
                    <div className="flex items-center gap-3 text-sm text-text-primary/50 py-4">
                      <div className="w-4 h-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                      <span>{dbStatsError ? "Unable to load database stats." : "Loading database stats..."}</span>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                          { label: "Total Documents", val: dbStats.totalDocuments.toLocaleString(), accent: "text-text-primary" },
                          { label: "Storage Used", val: formatBytes(dbStats.storageSize), accent: "text-accent" },
                          { label: "Indexes Size", val: formatBytes(dbStats.indexSize), accent: "text-text-primary" },
                          { label: "Collections", val: dbStats.collectionsCount.toLocaleString(), accent: "text-emerald-400" },
                        ].map((b, i) => (
                          <div key={i} className="p-4 rounded-xl bg-bg-primary/50 border border-border/50 admin-card">
                            <span className="text-xs font-semibold text-text-primary/40 uppercase tracking-wider block">
                              {b.label}
                            </span>
                            <span className={`text-xl font-extrabold block mt-1 ${b.accent}`}>{b.val}</span>
                          </div>
                        ))}
                      </div>

                      <div className="p-4 rounded-xl bg-bg-primary/50 border border-border/50 admin-card">
                        <div className="flex items-center justify-between text-xs mb-2">
                          <span className="font-semibold text-text-primary/60 uppercase tracking-wider">Storage capacity used</span>
                          <span className="font-bold text-text-primary">{formatBytes(dbStats.storageSize)} of {formatBytes(dbStats.fsTotalSize)}</span>
                        </div>
                        <div className="h-3 rounded-full bg-bg-primary/60 overflow-hidden border border-border/40">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-accent to-violet-500 transition-all duration-700"
                            style={{ width: `${dbStats.fsTotalSize > 0 ? Math.min(100, (dbStats.storageSize / dbStats.fsTotalSize) * 100) : 0}%` }}
                          />
                        </div>
                        <div className="mt-2 text-right text-xs font-bold text-text-primary/40">
                          {dbStats.fsTotalSize > 0 ? Math.round((dbStats.storageSize / dbStats.fsTotalSize) * 100) : 0}% used
                        </div>
                      </div>

                      {dbStats.collections.length > 0 && (
                        <div className="overflow-x-auto modal-scrollbar admin-table">
                          <table className="w-full text-left text-sm">
                            <thead>
                              <tr className="text-[10px] font-bold uppercase tracking-wider text-text-primary/40 border-b border-border">
                                <th className="text-left py-2 px-2">Collection</th>
                                <th className="text-right py-2 px-2">Documents</th>
                                <th className="text-right py-2 px-2">Avg Size</th>
                                <th className="text-right py-2 px-2">Data Size</th>
                                <th className="text-right py-2 px-2">Storage</th>
                                <th className="text-right py-2 px-2">Indexes</th>
                              </tr>
                            </thead>
                            <tbody>
                              {dbStats.collections.map((c) => (
                                <tr key={c.name} className="border-b border-border/40 last:border-0 hover:bg-white/[0.02]">
                                  <td className="py-2.5 px-2 font-semibold text-text-primary">{c.name}</td>
                                  <td className="py-2.5 px-2 text-right text-text-primary/70">{c.count.toLocaleString()}</td>
                                  <td className="py-2.5 px-2 text-right text-text-primary/50">{formatBytes(c.avgObjSize)}</td>
                                  <td className="py-2.5 px-2 text-right text-text-primary/60">{formatBytes(c.dataSize)}</td>
                                  <td className="py-2.5 px-2 text-right text-accent font-semibold">{formatBytes(c.storageSize)}</td>
                                  <td className="py-2.5 px-2 text-right text-text-primary/70">{c.totalIndexes}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
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
                    className={`admin-card admin-kpi p-5 ${st.border.includes("accent") ? "border-accent/20" : ""}`}
                  >
                    <span className="text-xs font-semibold text-text-primary/40 uppercase tracking-wider block">
                      {st.label}
                    </span>
                    <span className="text-3xl font-black block mt-2 text-text-primary">
                      {st.val}
                    </span>
                  </div>
                ))}
              </div>

              {/* Tournament Management Controls */}
              <div className="admin-card overflow-hidden">
                {/* Search / Filter Section */}
                <div className="p-6 border-b border-border flex flex-col md:flex-row items-center justify-between gap-4 bg-gradient-to-r from-accent/10 to-transparent">
                  <div className="relative w-full md:w-80">
                    <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-text-primary/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search tournament title..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-bg-primary/50 border border-border hover:border-accent/40 focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-lg pl-10 pr-4 py-2 text-sm text-text-primary placeholder:text-text-primary/30 outline-none transition-all"
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
                <div className="overflow-x-auto admin-table">
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
                            className="hover:bg-white/[0.02] transition-colors"
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
                                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${tournament.status === "ongoing"
                                    ? "bg-accent/15 text-accent border border-accent/20"
                                    : tournament.status === "upcoming"
                                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                      : "bg-white/10 text-text-primary/40 border border-border/40"
                                  }`}
                              >
                                <span className={`h-1.5 w-1.5 rounded-full ${tournament.status === "ongoing" ? "bg-accent" : tournament.status === "upcoming" ? "bg-emerald-400" : "bg-text-primary/30"}`} />
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
              <div className="admin-card overflow-hidden">
                <div className="p-6 border-b border-border bg-gradient-to-r from-accent/10 to-transparent flex items-center justify-between">
                  <div>
                    <h3 className="font-bold admin-section-title">Registered Players</h3>
                    <p className="text-xs text-text-primary/40 mt-1">Manage and audit registered player accounts</p>
                  </div>
                  <span className="px-3 py-1 rounded-lg bg-white/5 border border-border text-xs font-semibold text-text-primary/60">
                    {users.length} Total
                  </span>
                </div>

                <div className="overflow-x-auto admin-table">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-white/[0.01] text-xs font-bold uppercase tracking-wider text-text-primary/50">
                        <th className="px-6 py-4">Player UID</th>
                        <th className="px-6 py-4">In-Game Name</th>
                        <th className="px-6 py-4">WhatsApp Contact</th>
                        <th className="px-6 py-4 text-right">{adminRole === "admin" ? "Actions" : "Access"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 text-sm">
                      {users.length > 0 ? (
                        users.map((user) => (
                          <tr key={user.uid} className="hover:bg-white/[0.02] transition-colors">
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
                              {adminRole === "admin" ? (
                                <button
                                  onClick={() => handleDeleteUser(user.uid, user.inGameName)}
                                  className="px-3 py-1.5 rounded-lg bg-white/5 border border-red-500/40 text-xs font-semibold text-red-400 hover:bg-red-500/10 hover:border-red-500/60 transition-all cursor-pointer"
                                >
                                  Delete Account
                                </button>
                              ) : (
                                <span className="px-3 py-1.5 rounded bg-white/5 border border-border text-xs font-semibold text-text-primary/40">
                                  Read Only
                                </span>
                              )}
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
                <div className="admin-card overflow-hidden">
                  <div className="p-6 border-b border-border bg-gradient-to-r from-accent/10 to-transparent flex items-center justify-between">
                    <div>
                      <h3 className="font-bold admin-section-title">Registrations List</h3>
                      <p className="text-xs text-text-primary/40 mt-1">
                        Viewing registered teams and solo players for the selected tournament
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-lg bg-white/5 border border-border text-xs font-semibold text-text-primary/60">
                      {selectedTournRegistrations.length} Teams/Players
                    </span>
                  </div>

                  <div className="overflow-x-auto admin-table">
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
                            <tr key={reg.id} className="hover:bg-white/[0.02] transition-colors">
                              <td className="px-6 py-4 font-semibold text-text-primary">
                                <div className="flex items-center gap-3">
                                  {reg.teamLogo && (
                                    <button
                                      onClick={() => setExpandedImage({ src: reg.teamLogo!, title: "Team Logo" })}
                                      className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-accent/25 bg-white/5 cursor-pointer hover:scale-105 hover:border-accent transition-all group flex items-center justify-center"
                                      title="View team logo"
                                    >
                                      <img
                                        src={reg.teamLogo}
                                        alt="Team logo"
                                        className="h-full w-full object-cover"
                                      />
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                                          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                                        </svg>
                                      </div>
                                    </button>
                                  )}
                                  <div className="flex flex-col">
                                    <span>{reg.teamName || "Solo Player"}</span>
                                    <span className="text-[11px] text-accent font-semibold mt-0.5 uppercase tracking-wider">{reg.group}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-text-primary/70 font-mono">
                                {reg.whatsapp}
                              </td>
                              <td className="px-6 py-4">
                                <div className="space-y-1.5">
                                  {reg.members.map((m, idx) => (
                                    <div key={m.uid} className="flex items-center gap-2 text-xs">
                                      {m.picture ? (
                                        <button
                                          onClick={() => setExpandedImage({ src: m.picture!, title: `Player ${idx + 1} Picture` })}
                                          className="h-7 w-7 shrink-0 overflow-hidden rounded-full border border-accent/25 bg-white/5 cursor-pointer hover:scale-110 hover:border-accent transition-all group relative flex items-center justify-center"
                                          title="View player picture"
                                        >
                                          <img
                                            src={m.picture}
                                            alt={`Player ${idx + 1} picture`}
                                            className="h-full w-full object-cover"
                                          />
                                        </button>
                                      ) : (
                                        <span className="h-7 w-7 shrink-0 rounded-full border border-dashed border-border/40 bg-white/[0.02] flex items-center justify-center text-[8px] font-bold text-text-primary/30">
                                          P{idx + 1}
                                        </span>
                                      )}
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
                                    onClick={() => setExpandedImage({ src: reg.receiptImage, title: "Payment Receipt" })}
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
                                    "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border",
                                    reg.status === "approved"
                                      ? "bg-green-500/15 text-green-400 border-green-500/25"
                                      : reg.status === "rejected"
                                        ? "bg-red-500/15 text-red-400 border-red-500/25"
                                        : "bg-yellow-500/15 text-yellow-400 border-yellow-500/25"
                                  )}
                                >
                                  <span className={`h-1.5 w-1.5 rounded-full ${reg.status === "approved" ? "bg-green-400" : reg.status === "rejected" ? "bg-red-400" : "bg-yellow-400"}`} />
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
                          <div key={gName} className="admin-card overflow-hidden">
                            <div className="p-5 border-b border-border bg-gradient-to-r from-accent/10 to-transparent flex items-center justify-between">
                              <h4 className="font-bold text-text-primary uppercase tracking-wide flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_8px_rgba(255,184,0,0.6)]" />
                                {gName}
                              </h4>
                              <span className="px-2.5 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-xs font-semibold text-accent">
                                {grouped[gName].length} Teams
                              </span>
                            </div>
                            <div className="divide-y divide-border/60">
                              {grouped[gName].map((reg) => (
                                <div key={reg.id} className="p-4 flex flex-col gap-3 hover:bg-white/[0.02] transition-colors">
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-sm text-text-primary">
                                      {reg.teamName || "Solo Player"}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <span
                                        className={cn(
                                          "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                                          reg.status === "approved"
                                            ? "bg-green-500/15 text-green-400 border-green-500/25"
                                            : reg.status === "rejected"
                                              ? "bg-red-500/15 text-red-400 border-red-500/25"
                                              : "bg-yellow-500/15 text-yellow-400 border-yellow-500/25"
                                        )}
                                      >
                                        <span className={`h-1.5 w-1.5 rounded-full ${reg.status === "approved" ? "bg-green-400" : reg.status === "rejected" ? "bg-red-400" : "bg-yellow-400"}`} />
                                        {reg.status || "pending"}
                                      </span>
                                      <button
                                        onClick={() => handleEliminateTeam(reg.id, reg.teamName || "Solo Player")}
                                        className="px-2 py-0.5 rounded-lg bg-red-500/10 border border-red-500/30 text-[10px] font-semibold text-red-400 hover:bg-red-500/20 transition-all cursor-pointer"
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
                            <div key={gName} className="admin-card overflow-hidden">
                              <div className="p-5 border-b border-border bg-gradient-to-r from-accent/10 to-transparent flex items-center justify-between">
                                <h4 className="font-bold text-text-primary uppercase tracking-wide flex items-center gap-2">
                                  <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_8px_rgba(255,184,0,0.6)]" />
                                  {gName}
                                </h4>
                                <span className="px-2.5 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-xs font-semibold text-accent">
                                  {sortedRegs.length} Teams
                                </span>
                              </div>
                              <div className="overflow-x-auto admin-table">
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
                              <div key={m.id} className="admin-card admin-kpi p-5 flex flex-col justify-between relative group">
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-extrabold text-text-primary text-base">{m.title}</span>
                                    <span className="px-2.5 py-0.5 rounded-full bg-accent/15 border border-accent/25 text-[10px] font-bold text-accent uppercase tracking-wider shrink-0">{m.map}</span>
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
                                    className="px-2.5 py-1 rounded-lg bg-white/5 border border-border text-xs font-semibold text-text-primary/70 hover:text-text-primary hover:bg-white/10 transition-all cursor-pointer"
                                  >
                                    Edit Match
                                  </button>
                                  <button
                                    onClick={() => handleDeleteMatch(m.id, m.title)}
                                    className="px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/30 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-all cursor-pointer"
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
                    <div key={review.id} className="admin-card admin-kpi p-5 flex flex-col justify-between relative group">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent/30 to-accent/10 text-accent text-sm font-black border border-accent/25">
                              {(review.name || "E").slice(0, 1).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <span className="block font-extrabold text-text-primary text-sm truncate">{review.name}</span>
                              <span className="block text-[11px] text-text-primary/50 truncate">{review.tournament}</span>
                            </div>
                          </div>
                          <span
                            className={cn(
                              "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 border",
                              review.status === "approved"
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                : review.status === "rejected"
                                ? "bg-red-500/10 border-red-500/30 text-red-400"
                                : "bg-amber-500/10 border-amber-500/30 text-amber-400"
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
            <>
              <div className="max-w-xl animate-fade-in-up space-y-6">
                <div className="admin-card admin-kpi p-6">
                  <h3 className="font-bold admin-section-title">Admin Password Settings</h3>
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
                      className="w-full bg-bg-primary border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all"
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
                      className="w-full bg-bg-primary border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all"
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
                      className="w-full bg-bg-primary border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all"
                    />
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={isChangingPassword}
                      className="w-full py-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 admin-btn-primary"
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

              <div className="pt-6 border-t border-border/40">
                <div>
                  <h3 className="text-lg font-bold admin-section-title">Partner Password Settings</h3>
                  <p className="text-xs text-text-primary/40 mt-1">
                    Update the credentials used by your partner to access the panel with limited access (registrations, groups and matches only).
                  </p>
                </div>

                {changePartnerPasswordError && (
                  <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 font-semibold animate-fade-in">
                    {changePartnerPasswordError}
                  </div>
                )}

                {changePartnerPasswordSuccess && (
                  <div className="mt-4 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-xs text-green-400 font-semibold animate-fade-in">
                    {changePartnerPasswordSuccess}
                  </div>
                )}

                <form onSubmit={handleChangePartnerPasswordSubmit} className="space-y-4 max-w-md mt-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-primary/50 uppercase tracking-wider block">
                      Current Partner Password *
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Enter current partner password"
                      value={partnerCurrentPassword}
                      onChange={(e) => setPartnerCurrentPassword(e.target.value)}
                      className="w-full bg-bg-primary border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-primary/50 uppercase tracking-wider block">
                      New Partner Password *
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Enter new partner password"
                      value={partnerNewPassword}
                      onChange={(e) => setPartnerNewPassword(e.target.value)}
                      className="w-full bg-bg-primary border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-primary/50 uppercase tracking-wider block">
                      Confirm New Partner Password *
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Confirm new partner password"
                      value={partnerConfirmNewPassword}
                      onChange={(e) => setPartnerConfirmNewPassword(e.target.value)}
                      className="w-full bg-bg-primary border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all"
                    />
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={isChangingPartnerPassword}
                      className="w-full py-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 admin-btn-primary"
                    >
                      {isChangingPartnerPassword ? (
                        <>
                          <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                          Updating Partner Password...
                        </>
                      ) : (
                        "Update Partner Password"
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </>
          ) : activeTab === "wallet" ? (
            <AdminWalletPanel />
          ) : activeTab === "shop-orders" ? (
            <AdminShopOrdersPanel />
          ) : activeTab === "deletion-requests" ? (
            <div className="space-y-6 animate-fade-in-up">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-xl font-bold text-text-primary">Data Deletion Requests</h2>
                <select
                  value={deletionStatusFilter}
                  onChange={(e) => setDeletionStatusFilter(e.target.value)}
                  className="rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-text-primary"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="verified">Verified</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              {deletionRequests.length === 0 ? (
                <div className="rounded-xl border border-border bg-bg-secondary p-8 text-center text-text-primary/50">
                  No deletion requests found.
                </div>
              ) : (
                <div className="space-y-3">
                  {deletionRequests.map((req: any) => (
                    <div key={req.id} className="rounded-xl border border-border bg-bg-secondary p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-1 text-sm">
                          <p className="font-semibold text-text-primary">{req.fullName}</p>
                          <p className="text-text-primary/60">{req.emailOrUsername}</p>
                          {req.whatsappOrPhone && <p className="text-text-primary/60">{req.whatsappOrPhone}</p>}
                          {req.teamName && <p className="text-text-primary/60">Team: {req.teamName}</p>}
                          {req.reason && <p className="text-text-primary/50 text-xs italic">&quot;{req.reason}&quot;</p>}
                          <p className="text-text-primary/40 text-xs">ID: {req.id}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            req.status === "completed" ? "bg-emerald-600/20 text-emerald-400" :
                            req.status === "rejected" ? "bg-red-600/20 text-red-400" :
                            req.status === "processing" ? "bg-blue-600/20 text-blue-400" :
                            req.status === "verified" ? "bg-amber-600/20 text-amber-400" :
                            "bg-gray-600/20 text-gray-400"
                          }`}>
                            {req.status}
                          </span>
                          <select
                            value={req.status}
                            onChange={(e) => handleUpdateDeletionStatus(req.id, e.target.value)}
                            className="rounded-lg border border-border bg-bg-primary px-2 py-1 text-xs text-text-primary"
                          >
                            <option value="pending">Pending</option>
                            <option value="verified">Verified</option>
                            <option value="processing">Processing</option>
                            <option value="completed">Completed</option>
                            <option value="rejected">Rejected</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center max-w-md mx-auto text-center space-y-4 animate-fade-in-up">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent/20 to-transparent border border-accent/20 flex items-center justify-center text-accent">
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
              className="w-full bg-bg-primary border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-primary/50 uppercase tracking-wider block">Select Map *</label>
              <select
                value={newMatchMap}
                onChange={(e) => setNewMatchMap(e.target.value)}
                className="w-full bg-bg-primary border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all"
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
                      className="flex-1 bg-bg-primary border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all"
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
      {expandedImage && (
        <Modal
          isOpen={!!expandedImage}
          onClose={() => setExpandedImage(null)}
          title={expandedImage.title}
          width={650}
        >
          <div className="p-4 flex flex-col items-center gap-4 bg-bg-secondary">
            <div className="relative w-full max-h-[70vh] overflow-auto rounded-lg border border-border bg-bg-primary/50 flex justify-center p-2">
              <img
                src={expandedImage.src}
                alt={expandedImage.title}
                className="max-w-full max-h-[60vh] object-contain rounded-md animate-fade-in-up"
              />
            </div>
            <Button onClick={() => setExpandedImage(null)} variant="secondary" className="px-5">
              Close Preview
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
