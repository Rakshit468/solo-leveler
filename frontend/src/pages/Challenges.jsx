import React, { useEffect, useMemo, useState } from "react";
import { Trophy, Plus, Users, DoorOpen } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { challengeAPI } from "../services/api";
import LoadingSpinner from "../components/LoadingSpinner";
import StateCard from "../components/StateCard";

const Challenges = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const [challenges, setChallenges] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [leaderboard, setLeaderboard] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [autoJoinProcessed, setAutoJoinProcessed] = useState(false);

  const [createForm, setCreateForm] = useState({
    title: "",
    startDate: "",
    endDate: "",
    minQuestsPerDay: 1,
  });
  const [joinForm, setJoinForm] = useState({
    challengeId: "",
    inviteCode: "",
  });

  useEffect(() => {
    loadChallenges();
  }, []);

  useEffect(() => {
    if (loading || autoJoinProcessed) {
      return;
    }

    const challengeId = searchParams.get("challengeId") || "";
    const inviteCode = searchParams.get("inviteCode") || "";

    if (!challengeId) {
      setAutoJoinProcessed(true);
      return;
    }

    setJoinForm({ challengeId, inviteCode: inviteCode.toUpperCase() });
    void performJoinChallenge(challengeId, inviteCode.toUpperCase(), true);
    setAutoJoinProcessed(true);
    setSearchParams({});
  }, [autoJoinProcessed, loading, searchParams, setSearchParams]);

  useEffect(() => {
    if (selectedId) {
      loadChallengeLeaderboard(selectedId);
    }
  }, [selectedId]);

  const selectedChallenge = useMemo(
    () => challenges.find((challenge) => challenge._id === selectedId),
    [challenges, selectedId]
  );

  const loadChallenges = async () => {
    try {
      setError("");
      setLoading(true);
      const response = await challengeAPI.getMyChallenges();
      const items = response.data?.data || [];
      setChallenges(items);
      if (items.length > 0 && !selectedId) {
        setSelectedId(items[0]._id);
      }
    } catch (loadErr) {
      console.error("Load challenges error:", loadErr);
      setError(loadErr.response?.data?.message || "Failed to load challenges");
    } finally {
      setLoading(false);
    }
  };

  const loadChallengeLeaderboard = async (challengeId) => {
    try {
      const response = await challengeAPI.getChallengeLeaderboard(challengeId);
      setLeaderboard(response.data?.data?.entries || []);
    } catch (loadErr) {
      console.error("Load challenge leaderboard error:", loadErr);
      toast.error(loadErr.response?.data?.message || "Failed to load challenge leaderboard");
      setLeaderboard([]);
    }
  };

  const handleCreateChallenge = async (event) => {
    event.preventDefault();
    try {
      setSubmitting(true);
      await challengeAPI.createChallenge({
        title: createForm.title,
        startDate: createForm.startDate,
        endDate: createForm.endDate,
        rules: {
          minQuestsPerDay: Number(createForm.minQuestsPerDay || 1),
        },
      });
      toast.success("Challenge created");
      setCreateForm({
        title: "",
        startDate: "",
        endDate: "",
        minQuestsPerDay: 1,
      });
      await loadChallenges();
    } catch (createErr) {
      toast.error(createErr.response?.data?.message || "Failed to create challenge");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLeaveChallenge = async (challengeId) => {
    try {
      await challengeAPI.leaveChallenge(challengeId);
      toast.success("You left the challenge");
      await loadChallenges();
      setLeaderboard([]);
    } catch (leaveErr) {
      toast.error(leaveErr.response?.data?.message || "Could not leave challenge");
    }
  };

  const performJoinChallenge = async (challengeId, inviteCode, isFromInviteLink = false) => {
    if (!challengeId) {
      toast.error("Challenge ID is required");
      return;
    }

    try {
      setSubmitting(true);
      await challengeAPI.joinChallenge(challengeId, {
        inviteCode: inviteCode || undefined,
      });
      toast.success(isFromInviteLink ? "Joined challenge from invite link" : "Joined challenge");
      setJoinForm({ challengeId: "", inviteCode: "" });
      await loadChallenges();
      setSelectedId(challengeId);
      await loadChallengeLeaderboard(challengeId);
    } catch (joinErr) {
      toast.error(joinErr.response?.data?.message || "Could not join challenge");
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoinChallenge = async (event) => {
    event.preventDefault();
    await performJoinChallenge(joinForm.challengeId, joinForm.inviteCode, false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <StateCard
        tone="error"
        title="Unable to load challenges"
        description={error}
        actionLabel="Retry"
        onAction={loadChallenges}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Challenges</h1>
        <p className="text-gray-400 mt-2">Create 7-day accountability challenges and compete with your friends.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="card xl:col-span-1">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary-400" />
            Create Challenge
          </h3>
          <form className="space-y-3" onSubmit={handleCreateChallenge}>
            <input
              className="input"
              placeholder="7-Day Deep Work"
              value={createForm.title}
              onChange={(event) =>
                setCreateForm((prev) => ({ ...prev, title: event.target.value }))
              }
              required
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs text-gray-400 mb-1">Start Date</p>
                <input
                  className="input"
                  type="date"
                  value={createForm.startDate}
                  onChange={(event) =>
                    setCreateForm((prev) => ({ ...prev, startDate: event.target.value }))
                  }
                  required
                />
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">End Date</p>
                <input
                  className="input"
                  type="date"
                  value={createForm.endDate}
                  onChange={(event) =>
                    setCreateForm((prev) => ({ ...prev, endDate: event.target.value }))
                  }
                  required
                />
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Min Quests Per Day</p>
              <input
                className="input"
                type="number"
                min="1"
                max="20"
                value={createForm.minQuestsPerDay}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, minQuestsPerDay: event.target.value }))
                }
              />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={submitting}>
              {submitting ? "Creating..." : "Create Challenge"}
            </button>
          </form>
        </div>

        <div className="card xl:col-span-1">
          <h3 className="text-lg font-semibold text-white mb-4">Join Challenge</h3>
          <form className="space-y-3" onSubmit={handleJoinChallenge}>
            <input
              className="input"
              placeholder="Challenge ID"
              value={joinForm.challengeId}
              onChange={(event) =>
                setJoinForm((prev) => ({ ...prev, challengeId: event.target.value }))
              }
              required
            />
            <input
              className="input"
              placeholder="Invite Code (optional)"
              value={joinForm.inviteCode}
              onChange={(event) =>
                setJoinForm((prev) => ({ ...prev, inviteCode: event.target.value.toUpperCase() }))
              }
            />
            <button type="submit" className="btn-secondary w-full" disabled={submitting}>
              {submitting ? "Joining..." : "Join Challenge"}
            </button>
          </form>
        </div>

        <div className="card xl:col-span-1">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-secondary-400" />
            My Challenges
          </h3>

          {challenges.length === 0 ? (
            <StateCard
              title="No challenge yet"
              description="Create your first challenge to start competitive accountability."
            />
          ) : (
            <div className="space-y-3">
              {challenges.map((challenge) => (
                <button
                  key={challenge._id}
                  className={`w-full rounded-lg border p-4 text-left transition ${
                    selectedId === challenge._id
                      ? "border-primary-500 bg-primary-500/10"
                      : "border-dark-700 bg-dark-700 hover:border-dark-600"
                  }`}
                  onClick={() => setSelectedId(challenge._id)}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{challenge.title}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(challenge.startDate).toLocaleDateString()} - {new Date(challenge.endDate).toLocaleDateString()} · Invite: {challenge.inviteCode}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 rounded bg-dark-800 text-xs text-gray-300">
                        {challenge.participantUserIds?.length || 0} members
                      </span>
                      <button
                        type="button"
                        className="btn btn-outline h-8 px-3"
                        onClick={(event) => {
                          event.stopPropagation();
                          const inviteUrl = `${window.location.origin}/challenges?challengeId=${challenge._id}&inviteCode=${challenge.inviteCode}`;
                          navigator.clipboard.writeText(inviteUrl);
                          toast.success("Invite link copied");
                        }}
                      >
                        Copy Invite
                      </button>
                      {!challenge.isCreator ? (
                        <button
                          type="button"
                          className="btn btn-danger h-8 px-3"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleLeaveChallenge(challenge._id);
                          }}
                        >
                          <DoorOpen className="h-4 w-4 mr-1" />
                          Leave
                        </button>
                      ) : null}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedChallenge ? (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-accent-400" />
            Challenge Leaderboard
          </h3>

          {leaderboard.length === 0 ? (
            <StateCard
              title="No leaderboard data yet"
              description="Complete quests inside the challenge date range to populate rankings."
            />
          ) : (
            <div className="space-y-3">
              {leaderboard.map((entry) => (
                <div key={entry.userId} className="rounded-lg border border-dark-700 bg-dark-700 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-primary-300 font-semibold w-10">#{entry.rank}</span>
                      <img
                        src={`/avatars/${entry.avatar}`}
                        alt="avatar"
                        className="h-10 w-10 rounded-full object-cover border border-primary-500"
                        onError={(event) => {
                          event.currentTarget.onerror = null;
                          event.currentTarget.src = "/avatars/shadow-monarch-avatar.svg";
                        }}
                      />
                      <div>
                        <p className="font-semibold text-white">{entry.characterName}</p>
                        <p className="text-xs text-gray-400">{entry.username}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-right text-sm">
                      <div>
                        <p className="text-gray-400">Score</p>
                        <p className="text-primary-300 font-semibold">{entry.score}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Completed</p>
                        <p className="text-success-300 font-semibold">{entry.completedQuests}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default Challenges;
