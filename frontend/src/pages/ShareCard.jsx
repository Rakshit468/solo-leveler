import React, { useEffect, useRef, useState } from "react";
import { Share2, Copy, Download } from "lucide-react";
import toast from "react-hot-toast";
import { statsAPI } from "../services/api";
import LoadingSpinner from "../components/LoadingSpinner";
import StateCard from "../components/StateCard";

const ShareCard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const cardRef = useRef(null);

  useEffect(() => {
    loadShareCard();
  }, []);

  const loadShareCard = async () => {
    try {
      setError("");
      setLoading(true);
      const response = await statsAPI.getShareCard();
      setData(response.data?.data || null);
    } catch (loadErr) {
      console.error("Load share card error:", loadErr);
      setError(loadErr.response?.data?.message || "Failed to load share card");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!data) return;
    const text = `${data.characterName} · Lv ${data.level} · ${data.streak} day streak · ${data.questsCompletedThisWeek} quests this week · ${data.title}`;
    await navigator.clipboard.writeText(text);
    toast.success("Share summary copied");
  };

  const handleDownload = () => {
    if (!cardRef.current || !data) return;

    const safeName = (data.characterName || "hunter").replace(/[^a-z0-9]/gi, "-").toLowerCase();
    const content = `
      <svg xmlns="http://www.w3.org/2000/svg" width="1000" height="560">
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#111827" />
            <stop offset="100%" stop-color="#1e3a8a" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#bg)" />
        <text x="60" y="90" fill="#93c5fd" font-size="34" font-family="Arial">Solo Leveling - Weekly Share Card</text>
        <text x="60" y="170" fill="#ffffff" font-size="56" font-family="Arial" font-weight="bold">${data.characterName}</text>
        <text x="60" y="230" fill="#e5e7eb" font-size="32" font-family="Arial">Title: ${data.title}</text>
        <text x="60" y="280" fill="#e5e7eb" font-size="32" font-family="Arial">Class: ${data.hunterClass}</text>
        <text x="60" y="330" fill="#e5e7eb" font-size="32" font-family="Arial">Level: ${data.level}</text>
        <text x="60" y="380" fill="#e5e7eb" font-size="32" font-family="Arial">Streak: ${data.streak} days</text>
        <text x="60" y="430" fill="#e5e7eb" font-size="32" font-family="Arial">Quests This Week: ${data.questsCompletedThisWeek}</text>
      </svg>
    `.trim();

    const blob = new Blob([content], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${safeName}-share-card.svg`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Share card downloaded");
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
        title="Unable to load share card"
        description={error}
        actionLabel="Retry"
        onAction={loadShareCard}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Share Card</h1>
        <p className="text-gray-400 mt-2">Share your current hunter progress with one click.</p>
      </div>

      <div
        ref={cardRef}
        className="rounded-2xl border border-primary-600/40 bg-gradient-to-br from-dark-800 to-primary-900/40 p-6 shadow-lg"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-primary-300 text-sm uppercase tracking-wide">Solo Leveling</p>
            <h2 className="text-3xl font-bold text-white mt-1">{data?.characterName}</h2>
            <p className="text-gray-300 mt-2">{data?.title}</p>
          </div>
          <img
            src={`/avatars/${data?.avatar || "shadow-monarch-avatar.svg"}`}
            alt="avatar"
            className="h-20 w-20 rounded-full border-2 border-primary-400 object-cover"
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = "/avatars/shadow-monarch-avatar.svg";
            }}
          />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-lg bg-dark-900/60 p-3">
            <p className="text-xs text-gray-400">Class</p>
            <p className="text-white font-semibold mt-1">{data?.hunterClass}</p>
          </div>
          <div className="rounded-lg bg-dark-900/60 p-3">
            <p className="text-xs text-gray-400">Level</p>
            <p className="text-white font-semibold mt-1">{data?.level}</p>
          </div>
          <div className="rounded-lg bg-dark-900/60 p-3">
            <p className="text-xs text-gray-400">Streak</p>
            <p className="text-white font-semibold mt-1">{data?.streak} days</p>
          </div>
          <div className="rounded-lg bg-dark-900/60 p-3">
            <p className="text-xs text-gray-400">Weekly Quests</p>
            <p className="text-white font-semibold mt-1">{data?.questsCompletedThisWeek}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button className="btn-primary" onClick={handleCopy}>
          <Copy className="h-4 w-4 mr-2" />
          Copy Summary
        </button>
        <button className="btn-secondary" onClick={handleDownload}>
          <Download className="h-4 w-4 mr-2" />
          Download Card
        </button>
        <button
          className="btn-outline"
          onClick={() => {
            toast("Share card ready to post", { icon: "📣" });
          }}
        >
          <Share2 className="h-4 w-4 mr-2" />
          Quick Share
        </button>
      </div>
    </div>
  );
};

export default ShareCard;
