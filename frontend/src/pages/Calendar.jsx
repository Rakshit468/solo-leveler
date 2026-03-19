import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import {
  CalendarDays,
  Link2,
  Link2Off,
  RefreshCw,
  Star,
  Clock,
  Target,
  Plus,
} from "lucide-react";
import toast from "react-hot-toast";
import { useSearchParams } from "react-router-dom";
import { questAPI } from "../services/api";
import LoadingSpinner from "../components/LoadingSpinner";
import CreateQuestModal from "../components/CreateQuestModal";

const priorityColor = {
  low: "#10b981",
  medium: "#3b82f6",
  high: "#f59e0b",
  critical: "#ef4444",
};

const formatDateTime = (value) => {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleString();
};

const Calendar = () => {
  const [loading, setLoading] = useState(true);
  const [syncLoading, setSyncLoading] = useState(false);
  const [quests, setQuests] = useState([]);
  const [googleCalendar, setGoogleCalendar] = useState({
    connected: false,
    email: null,
  });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [selectedQuest, setSelectedQuest] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const loadCalendarState = async () => {
    try {
      const [questResponse, googleResponse] = await Promise.all([
        questAPI.getQuests({ status: "active", limit: 200 }),
        questAPI.getGoogleCalendarStatus(),
      ]);

      setQuests(questResponse.data.data.quests || []);
      setGoogleCalendar(googleResponse.data.data || { connected: false, email: null });
    } catch (error) {
      console.error("Load calendar state error:", error);
      toast.error("Failed to load calendar data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCalendarState();
  }, []);

  useEffect(() => {
    const state = searchParams.get("googleCalendar");
    if (state === "connected") {
      toast.success("Google Calendar connected successfully");
      setSearchParams({}, { replace: true });
      loadCalendarState();
    }
    if (state === "error") {
      toast.error("Google Calendar connection failed");
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const events = useMemo(() => {
    return quests
      .filter((quest) => quest.dueDate || quest.startDateTime)
      .map((quest) => {
        const hasSlot = Boolean(quest.startDateTime);
        const start = hasSlot ? quest.startDateTime : quest.dueDate;
        const end = hasSlot ? quest.endDateTime : undefined;

        return {
          id: quest._id,
          title: quest.title,
          start,
          end,
          allDay: !hasSlot,
          backgroundColor: priorityColor[quest.priority] || "#3b82f6",
          borderColor: priorityColor[quest.priority] || "#3b82f6",
          extendedProps: {
            quest,
          },
        };
      });
  }, [quests]);

  const handleGoogleConnect = async () => {
    try {
      const response = await questAPI.getGoogleCalendarAuthUrl();
      window.location.href = response.data.data.authUrl;
    } catch (error) {
      console.error("Get Google Calendar auth URL error:", error);
      toast.error("Unable to start Google Calendar connection");
    }
  };

  const handleGoogleDisconnect = async () => {
    setSyncLoading(true);
    try {
      await questAPI.disconnectGoogleCalendar();
      toast.success("Google Calendar disconnected");
      await loadCalendarState();
    } catch (error) {
      console.error("Disconnect Google Calendar error:", error);
      toast.error("Failed to disconnect Google Calendar");
    } finally {
      setSyncLoading(false);
    }
  };

  const handleSyncAll = async () => {
    setSyncLoading(true);
    try {
      const response = await questAPI.syncAllToGoogleCalendar();
      toast.success(response.data.message || "Quests synced to Google Calendar");
      await loadCalendarState();
    } catch (error) {
      console.error("Sync all error:", error);
      toast.error(error.response?.data?.message || "Failed to sync quests");
    } finally {
      setSyncLoading(false);
    }
  };

  const handleSyncSingleQuest = async (questId) => {
    setSyncLoading(true);
    try {
      await questAPI.syncQuestToGoogleCalendar(questId);
      toast.success("Quest synced to Google Calendar");
      await loadCalendarState();
    } catch (error) {
      console.error("Sync single quest error:", error);
      toast.error(error.response?.data?.message || "Failed to sync quest");
    } finally {
      setSyncLoading(false);
    }
  };

  const handleQuestCreate = (newQuest) => {
    setQuests((prev) => [newQuest, ...prev]);
    setShowCreateModal(false);
    toast.success("Quest created successfully");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Quest Calendar</h1>
          <p className="mt-2 text-gray-400">Plan quests with date + time slots and sync directly to Google Calendar.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <motion.button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.98 }}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Quest
          </motion.button>
          {googleCalendar.connected ? (
            <>
              <button
                onClick={handleSyncAll}
                disabled={syncLoading}
                className="btn-secondary"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Sync All
              </button>
              <button
                onClick={handleGoogleDisconnect}
                disabled={syncLoading}
                className="btn-outline"
              >
                <Link2Off className="mr-2 h-4 w-4" />
                Disconnect Google
              </button>
            </>
          ) : (
            <button onClick={handleGoogleConnect} className="btn-secondary">
              <Link2 className="mr-2 h-4 w-4" />
              Connect Google Calendar
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <div className="mb-3 flex items-center gap-2 text-sm text-gray-300">
          <CalendarDays className="h-4 w-4 text-primary-400" />
          Google Calendar: {googleCalendar.connected ? `Connected (${googleCalendar.email || "Unknown account"})` : "Not connected"}
        </div>

        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          headerToolbar={
            isMobile
              ? {
                  left: "prev,next",
                  center: "title",
                  right: "listWeek,dayGridMonth",
                }
              : {
                  left: "prev,next today",
                  center: "title",
                  right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
                }
          }
          initialView={isMobile ? "listWeek" : "dayGridMonth"}
          height="auto"
          events={events}
          eventClick={(info) => setSelectedQuest(info.event.extendedProps.quest)}
          dayMaxEventRows={isMobile ? 2 : 3}
          nowIndicator
        />
      </div>

      {selectedQuest && (
        <div className="card">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-xl font-semibold text-white">{selectedQuest.title}</h3>
              {selectedQuest.description && (
                <p className="mt-2 text-sm text-gray-400">{selectedQuest.description}</p>
              )}
              <div className="mt-4 grid grid-cols-1 gap-2 text-sm text-gray-300 sm:grid-cols-2">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary-400" />
                  {selectedQuest.type} / {selectedQuest.category}
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-accent-400" />
                  {selectedQuest.xpReward} XP
                </div>
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-secondary-400" />
                  Due: {formatDateTime(selectedQuest.dueDate)}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  Slot: {formatDateTime(selectedQuest.startDateTime)} to {formatDateTime(selectedQuest.endDateTime)}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:w-48">
              {googleCalendar.connected && (
                <button
                  onClick={() => handleSyncSingleQuest(selectedQuest._id)}
                  className="btn-primary"
                  disabled={syncLoading}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sync This Quest
                </button>
              )}
              <button onClick={() => setSelectedQuest(null)} className="btn-outline">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <CreateQuestModal
          onClose={() => setShowCreateModal(false)}
          onQuestCreate={handleQuestCreate}
        />
      )}
    </div>
  );
};

export default Calendar;
