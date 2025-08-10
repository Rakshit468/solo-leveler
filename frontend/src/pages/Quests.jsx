import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Plus, Filter, Search } from "lucide-react";
import { questAPI } from "../services/api";
import QuestCard from "../components/QuestCard";
import LoadingSpinner from "../components/LoadingSpinner";
import CreateQuestModal from "../components/CreateQuestModal";
import toast from "react-hot-toast";
import { useDebounce } from "../hooks/useDebounce";

const Quests = () => {
  const [quests, setQuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filters, setFilters] = useState({
    type: "all",
    status: "active",
    category: "all",
    search: "",
  });
  const debouncedSearch = useDebounce(filters.search, 300);

  useEffect(() => {
    // We pass debouncedSearch to loadQuests to ensure it's called with the stable value
    loadQuests(debouncedSearch);
  }, [debouncedSearch, filters.type, filters.status, filters.category]);

  const loadQuests = useCallback(
    async (searchTerm) => {
      try {
        const params = {
          search: searchTerm,
          type: filters.type,
          status: filters.status,
          category: filters.category,
        };

        // Remove 'all' filters and empty search before sending to API
        Object.keys(params).forEach((key) => {
          if (params[key] === "all" || !params[key]) {
            delete params[key];
          }
        });

        const response = await questAPI.getQuests(params);
        setQuests(response.data.data.quests);
      } catch (error) {
        console.error("Error loading quests:", error);
        toast.error("Failed to load quests");
      } finally {
        setLoading(false);
      }
    },
    [filters.type, filters.status, filters.category]
  ); // useCallback dependencies

  const handleQuestComplete = (questId) => {
    setQuests((prev) =>
      prev.map((quest) =>
        quest._id === questId ? { ...quest, status: "completed" } : quest
      )
    );
  };

  const handleQuestCreate = (newQuest) => {
    setQuests((prev) => [newQuest, ...prev]);
    setShowCreateModal(false);
    toast.success("Quest created successfully!");
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Quests</h1>
          <p className="text-gray-400 mt-2">
            Manage your quests and track progress
          </p>
        </div>
        <motion.button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Plus className="h-5 w-5 mr-2" />
          New Quest
        </motion.button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search quests..."
              className="input pl-10"
              value={filters.search}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, search: e.target.value }))
              }
            />
          </div>

          {/* Type Filter */}
          <select
            className="input"
            value={filters.type}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, type: e.target.value }))
            }
          >
            <option value="all">All Types</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="boss">Boss Battle</option>
            <option value="custom">Custom</option>
          </select>

          {/* Status Filter */}
          <select
            className="input"
            value={filters.status}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, status: e.target.value }))
            }
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="paused">Paused</option>
          </select>

          {/* Category Filter */}
          <select
            className="input"
            value={filters.category}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, category: e.target.value }))
            }
          >
            <option value="all">All Categories</option>
            <option value="health">Health</option>
            <option value="knowledge">Knowledge</option>
            <option value="productivity">Productivity</option>
            <option value="creativity">Creativity</option>
            <option value="social">Social</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {/* Quest Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <div className="text-2xl font-bold text-primary-400">
            {quests.filter((q) => q.status === "active").length}
          </div>
          <div className="text-gray-400 text-sm">Active Quests</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-success-400">
            {quests.filter((q) => q.status === "completed").length}
          </div>
          <div className="text-gray-400 text-sm">Completed</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-accent-400">
            {quests.reduce(
              (total, quest) =>
                total + (quest.status === "completed" ? quest.xpReward : 0),
              0
            )}
          </div>
          <div className="text-gray-400 text-sm">Total XP Earned</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-secondary-400">
            {Math.round(
              (quests.filter((q) => q.status === "completed").length /
                Math.max(quests.length, 1)) *
                100
            )}
            %
          </div>
          <div className="text-gray-400 text-sm">Completion Rate</div>
        </div>
      </div>

      {/* Quests List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {quests.length > 0 ? (
          quests.map((quest, index) => (
            <motion.div
              key={quest._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <QuestCard quest={quest} onQuestComplete={handleQuestComplete} />
            </motion.div>
          ))
        ) : (
          <div className="col-span-full">
            <div className="card text-center py-12">
              <Filter className="h-16 w-16 text-gray-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                No quests found
              </h3>
              <p className="text-gray-400 mb-4">
                {filters.search ||
                filters.type !== "all" ||
                filters.status !== "all" ||
                filters.category !== "all"
                  ? "Try adjusting your filters or search terms"
                  : "Create your first quest to get started on your journey!"}
              </p>
              <motion.button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary"
                whileHover={{ scale: 1.05 }}
              >
                <Plus className="h-5 w-5 mr-2" />
                Create Your First Quest
              </motion.button>
            </div>
          </div>
        )}
      </div>

      {/* Create Quest Modal */}
      {showCreateModal && (
        <CreateQuestModal
          onClose={() => setShowCreateModal(false)}
          onQuestCreate={handleQuestCreate}
        />
      )}
    </div>
  );
};

export default Quests;
