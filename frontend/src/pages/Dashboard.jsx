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
  Lock,
  ShieldCheck
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { authAPI, questAPI, statsAPI } from '../services/api'
import StatCard from '../components/StatCard'
import QuestCard from '../components/QuestCard'
import LoadingSpinner from '../components/LoadingSpinner'
import toast from 'react-hot-toast'

const Dashboard = () => {
  const { user, updateUser } = useAuth()
  const [dashboardData, setDashboardData] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [streakTimeline, setStreakTimeline] = useState([])
  const [shieldSaving, setShieldSaving] = useState(false)
  const [selectedShieldDate, setSelectedShieldDate] = useState('')

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

      const progression = dashboardResponse.data?.data?.progression || {}
      const firstMissingDate = progression?.missingShieldDates?.[0] || ''
      setSelectedShieldDate(firstMissingDate)

      const timelineResponse = await statsAPI.getStreakTimeline({ days: 30 })
      setStreakTimeline(timelineResponse.data?.data?.timeline || [])
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
  const shieldAutoUse = progression?.shieldAutoUse !== false

  const handleShieldAutoToggle = async () => {
    try {
      setShieldSaving(true)
      const nextValue = !shieldAutoUse
      const nextPreferences = {
        ...(user?.preferences || {}),
        shieldAutoUse: nextValue,
      }

      const response = await authAPI.updateProfile({ preferences: nextPreferences })
      if (response.data?.success) {
        updateUser(response.data.data)
        toast.success(nextValue ? 'Auto shield enabled' : 'Auto shield disabled')
        await loadDashboardData()
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update shield setting')
    } finally {
      setShieldSaving(false)
    }
  }

  const handleUseShieldNow = async () => {
    if (!selectedShieldDate) {
      toast.error('Select a missed date first')
      return
    }

    try {
      setShieldSaving(true)
      const response = await authAPI.useShieldNow({ targetDate: selectedShieldDate })
      if (response.data?.success) {
        if (response.data?.data?.user) {
          updateUser(response.data.data.user)
        }
        toast.success(response.data?.message || 'Shield used successfully')
        await loadDashboardData()
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not use shield now')
    } finally {
      setShieldSaving(false)
    }
  }

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

      <div className="card">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Streak Timeline (30 days)</h3>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-success-500" />Active</span>
            <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-primary-500" />Shielded</span>
            <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-gray-600" />Missed</span>
          </div>
        </div>
        <div className="grid grid-cols-10 gap-1 sm:grid-cols-10 lg:grid-cols-10 xl:grid-cols-15">
          {streakTimeline.map((entry) => {
            const color =
              entry.state === 'active'
                ? 'bg-success-500'
                : entry.state === 'shielded'
                ? 'bg-primary-500'
                : 'bg-gray-600'
            return (
              <div
                key={entry.date}
                title={`${entry.date} - ${entry.state} (${entry.completedCount} completed)`}
                className={`h-6 rounded ${color}`}
              />
            )
          })}
        </div>
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

          <div className="mt-4 border-t border-dark-700 pt-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-white">Auto-use Shield</p>
                <p className="text-xs text-gray-400">Automatically spend shield on a one-day miss</p>
              </div>
              <button
                type="button"
                onClick={handleShieldAutoToggle}
                disabled={shieldSaving}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                  shieldAutoUse ? 'bg-primary-500' : 'bg-dark-600'
                }`}
                aria-label="Toggle shield auto use"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    shieldAutoUse ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {!shieldAutoUse && progression?.canUseShieldNow && progression?.shieldCharges > 0 && (
              <div className="rounded-lg border border-secondary-700/60 bg-dark-900/60 p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-secondary-200">Choose any missed date to apply your shield.</p>
                  <p className="text-xs text-gray-400">
                    No expiry window. Shield will be consumed for the selected date.
                  </p>
                  <select
                    className="input mt-2"
                    value={selectedShieldDate}
                    onChange={(event) => setSelectedShieldDate(event.target.value)}
                    disabled={shieldSaving}
                  >
                    {(progression?.missingShieldDates || []).map((dateKey) => (
                      <option key={dateKey} value={dateKey}>
                        {dateKey}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={handleUseShieldNow}
                  disabled={shieldSaving}
                  className="btn-secondary whitespace-nowrap"
                >
                  <span className="inline-flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    Use Shield
                  </span>
                </button>
              </div>
            )}
          </div>
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