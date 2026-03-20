import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Target, 
  Zap, 
  Trophy, 
  Clock, 
  Star,
  TrendingUp,
  Calendar,
  Shield,
  Lock
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { questAPI, statsAPI } from '../services/api'
import StatCard from '../components/StatCard'
import QuestCard from '../components/QuestCard'
import LoadingSpinner from '../components/LoadingSpinner'

const Dashboard = () => {
  const { user } = useAuth()
  const [dashboardData, setDashboardData] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const [dashboardResponse, statsResponse] = await Promise.all([
        questAPI.getDashboardData(),
        statsAPI.getStats()
      ])
      
      setDashboardData(dashboardResponse.data.data)
      setStats(statsResponse.data.data)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleQuestComplete = (questId) => {
    // Refresh dashboard data after quest completion
    loadDashboardData()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const dailyQuests = dashboardData?.quests?.daily || []
  const weeklyQuests = dashboardData?.quests?.weekly || []
  const bossQuests = dashboardData?.quests?.boss || []
  const progression = dashboardData?.progression || {}
  const className = progression.primaryClass
    ? `${progression.primaryClass.charAt(0).toUpperCase()}${progression.primaryClass.slice(1)}`
    : 'Unassigned'
  const unlockStreak = progression.dualClassUnlockStreak || 60
  const currentStreak = user?.streaks?.current || 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">
          Welcome back, {user?.character?.name || user?.username}!
        </h1>
        <p className="text-gray-400 mt-2">
          Ready to continue your journey? You're doing amazing!
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Current Level"
          value={user?.character?.level || 1}
          subtitle={`${user?.character?.xp || 0} / ${user?.character?.xpToNextLevel || 100} XP`}
          icon={Star}
          color="primary"
        />
        <StatCard
          title="Quests Today"
          value={dashboardData?.quests?.completedToday || 0}
          subtitle="Completed today"
          icon={Target}
          color="success"
        />
        <StatCard
          title="Active Quests"
          value={(dailyQuests.length + weeklyQuests.length + bossQuests.length) || 0}
          subtitle="In progress"
          icon={Clock}
          color="secondary"
        />
        <StatCard
          title="Current Streak"
          value={user?.streaks?.current || 0}
          subtitle="Days in a row"
          icon={TrendingUp}
          color="warning"
        />
      </div>

      {/* Character Stats */}
      <div className="card">
        <h3 className="text-xl font-semibold text-white mb-4">Character Stats</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-400">
              {user?.character?.stats?.strength || 10}
            </div>
            <div className="text-sm text-gray-400">Strength</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">
              {user?.character?.stats?.intelligence || 10}
            </div>
            <div className="text-sm text-gray-400">Intelligence</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">
              {user?.character?.stats?.productivity ?? user?.character?.stats?.agility ?? 10}
            </div>
            <div className="text-sm text-gray-400">Productivity</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400">
              {user?.character?.stats?.consistency ?? user?.character?.stats?.luck ?? 10}
            </div>
            <div className="text-sm text-gray-400">Consistency</div>
          </div>
        </div>
      </div>

      <div className="card border-primary-700/50">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-wide text-gray-400">Hunter Class</p>
            <h3 className="text-xl font-semibold text-white mt-1">{className}</h3>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <Shield className="h-4 w-4 text-secondary-400" />
            <span>{progression.shieldCharges > 0 ? 'Shield Ready' : 'Shield Used'}</span>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <Lock className="h-4 w-4 text-primary-300" />
            <span>
              {progression.dualClassUnlocked
                ? 'Dual Class unlocked'
                : `Dual Class unlocks at ${unlockStreak}-day streak`}
            </span>
          </div>
          {!progression.dualClassUnlocked && (
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-dark-700">
              <div
                className="h-full bg-gradient-to-r from-primary-500 to-secondary-500"
                style={{ width: `${Math.min(100, Math.round((currentStreak / unlockStreak) * 100))}%` }}
              />
            </div>
          )}
          {!progression.dualClassUnlocked && (
            <p className="mt-2 text-xs text-gray-400">
              {currentStreak} / {unlockStreak} streak days completed
            </p>
          )}
        </div>
      </div>

      {/* Quest Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
        {/* Daily Quests */}
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <Clock className="h-5 w-5 text-primary-400" />
            <h3 className="text-xl font-semibold text-white">Daily Quests</h3>
            <span className="bg-primary-500 text-white text-xs px-2 py-1 rounded-full">
              {dailyQuests.length}
            </span>
          </div>
          <div className="space-y-4">
            {dailyQuests.length > 0 ? (
              dailyQuests.map((quest) => (
                <QuestCard 
                  key={quest._id} 
                  quest={quest} 
                  onQuestComplete={handleQuestComplete}
                />
              ))
            ) : (
              <div className="card text-center py-8">
                <Calendar className="h-12 w-12 text-gray-500 mx-auto mb-2" />
                <p className="text-gray-400">No daily quests yet</p>
                <p className="text-sm text-gray-500">Create some daily habits to get started!</p>
              </div>
            )}
          </div>
        </div>

        {/* Weekly Quests */}
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <Target className="h-5 w-5 text-secondary-400" />
            <h3 className="text-xl font-semibold text-white">Weekly Quests</h3>
            <span className="bg-secondary-500 text-white text-xs px-2 py-1 rounded-full">
              {weeklyQuests.length}
            </span>
          </div>
          <div className="space-y-4">
            {weeklyQuests.length > 0 ? (
              weeklyQuests.map((quest) => (
                <QuestCard 
                  key={quest._id} 
                  quest={quest} 
                  onQuestComplete={handleQuestComplete}
                />
              ))
            ) : (
              <div className="card text-center py-8">
                <Target className="h-12 w-12 text-gray-500 mx-auto mb-2" />
                <p className="text-gray-400">No weekly quests yet</p>
                <p className="text-sm text-gray-500">Set some weekly goals!</p>
              </div>
            )}
          </div>
        </div>

        {/* Boss Battles */}
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <Zap className="h-5 w-5 text-accent-400" />
            <h3 className="text-xl font-semibold text-white">Boss Battles</h3>
            <span className="bg-accent-500 text-white text-xs px-2 py-1 rounded-full">
              {bossQuests.length}
            </span>
          </div>
          <div className="space-y-4">
            {bossQuests.length > 0 ? (
              bossQuests.map((quest) => (
                <QuestCard 
                  key={quest._id} 
                  quest={quest} 
                  onQuestComplete={handleQuestComplete}
                />
              ))
            ) : (
              <div className="card text-center py-8">
                <Zap className="h-12 w-12 text-gray-500 mx-auto mb-2" />
                <p className="text-gray-400">No boss battles yet</p>
                <p className="text-sm text-gray-500">Take on a big challenge!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      {dashboardData?.recentActivity && dashboardData.recentActivity.length > 0 && (
        <div className="card">
          <h3 className="text-xl font-semibold text-white mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {dashboardData.recentActivity.slice(0, 5).map((activity, index) => (
              <motion.div
                key={activity._id}
                className="flex items-center justify-between py-2 border-b border-dark-700 last:border-b-0"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div>
                  <p className="text-white text-sm">{activity.reason}</p>
                  <p className="text-gray-400 text-xs">
                    {new Date(activity.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-accent-400 font-semibold">
                  +{activity.amount} XP
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard