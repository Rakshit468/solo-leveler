import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, Dumbbell, Hammer, Compass, Lock, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { authAPI } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import LoadingSpinner from "../components/LoadingSpinner";

const classIcons = {
  scholar: BookOpen,
  warrior: Dumbbell,
  builder: Hammer,
  strategist: Compass,
};

const Onboarding = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [starterQuests, setStarterQuests] = useState([]);
  const [step, setStep] = useState("class");
  const [unlockStreak, setUnlockStreak] = useState(60);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const response = await authAPI.getOnboardingOptions();
        const payload = response.data?.data || {};
        setClasses(payload.classes || []);
        setUnlockStreak(payload.dualClassUnlockStreak || 60);
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to load onboarding options");
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, []);

  const selectedClassMeta = useMemo(
    () => classes.find((item) => item.id === selectedClass),
    [classes, selectedClass]
  );

  const handleClassContinue = async () => {
    if (!selectedClass) {
      toast.error("Choose your starting class to continue");
      return;
    }

    setSaving(true);
    try {
      const response = await authAPI.setupOnboarding({ primaryClass: selectedClass });
      const payload = response.data?.data || {};
      setStarterQuests(payload.starterQuests || []);
      if (payload.user) {
        updateUser(payload.user);
      }
      setStep("plan");
      toast.success("Class selected. Your starter quests are ready.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to set up onboarding");
    } finally {
      setSaving(false);
    }
  };

  const updateQuestField = (index, key, value) => {
    setStarterQuests((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [key]: value };
      return next;
    });
  };

  const handleSaveAndContinue = async () => {
    setSaving(true);
    try {
      const payload = {
        quests: starterQuests.map((quest) => ({
          id: quest._id,
          title: quest.title,
          description: quest.description,
        })),
      };
      await authAPI.updateStarterQuests(payload);
      toast.success("Your plan is ready. Welcome to the Guild.");
      navigate("/dashboard");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save starter quests");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold gradient-text">Forge Your Hunter Path</h1>
          <p className="mt-2 text-gray-300">
            Pick one starting class now. Dual class unlocks at a {unlockStreak}-day streak.
          </p>
        </div>

        {step === "class" ? (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              {classes.map((item) => {
                const Icon = classIcons[item.id] || Sparkles;
                const isActive = selectedClass === item.id;

                return (
                  <motion.button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedClass(item.id)}
                    className={`card text-left transition-all ${
                      isActive ? "ring-2 ring-primary-500 border-primary-400" : "hover:border-primary-700"
                    }`}
                    whileHover={{ y: -2 }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-semibold text-white">{item.name}</h2>
                        <p className="mt-1 text-sm text-gray-300">{item.tagline}</p>
                      </div>
                      <Icon className="h-6 w-6 text-primary-400" />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {item.tags.map((tag) => (
                        <span
                          key={`${item.id}-${tag}`}
                          className="rounded-full border border-dark-600 bg-dark-700 px-3 py-1 text-xs text-gray-200"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </motion.button>
                );
              })}
            </div>

            <div className="card border-primary-700/60 bg-dark-800/80">
              <div className="flex items-center gap-2 text-primary-300">
                <Lock className="h-4 w-4" />
                <span className="font-medium">Dual Class Locked</span>
              </div>
              <p className="mt-2 text-sm text-gray-300">
                Stay consistent for {unlockStreak} days to unlock your secondary class slot.
              </p>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleClassContinue}
                disabled={saving || !selectedClass}
                className="btn-primary px-6 py-3"
              >
                {saving ? "Preparing your quests..." : "Continue"}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="card">
              <h2 className="text-xl font-semibold text-white">Plan Today</h2>
              <p className="mt-1 text-sm text-gray-300">
                We created 3 starter quests for {selectedClassMeta?.name || "your class"}. Edit them if you want.
              </p>

              <div className="mt-5 space-y-4">
                {starterQuests.map((quest, index) => (
                  <div key={quest._id} className="rounded-lg border border-dark-700 bg-dark-900/60 p-4">
                    <label className="mb-1 block text-xs uppercase tracking-wide text-gray-400">Quest {index + 1}</label>
                    <input
                      className="input"
                      value={quest.title || ""}
                      onChange={(event) => updateQuestField(index, "title", event.target.value)}
                      maxLength={100}
                    />
                    <textarea
                      className="input mt-3 min-h-[80px]"
                      value={quest.description || ""}
                      onChange={(event) => updateQuestField(index, "description", event.target.value)}
                      maxLength={500}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <button type="button" className="btn-outline" onClick={() => setStep("class")}>
                Back
              </button>
              <button
                type="button"
                className="btn-primary px-6 py-3"
                onClick={handleSaveAndContinue}
                disabled={saving}
              >
                {saving ? "Saving..." : "Start My Journey"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
