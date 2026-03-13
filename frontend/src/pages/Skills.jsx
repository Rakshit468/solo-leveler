import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Zap, Lock, CheckCircle, Star } from 'lucide-react'
import { skillsAPI } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { useNotifications } from '../contexts/NotificationContext'
import LoadingSpinner from '../components/LoadingSpinner'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const categoryColors = {
  health: 'from-red-500 to-red-600',
  knowledge: 'from-blue-500 to-blue-600',
  productivity: 'from-green-500 to-green-600',
  creativity: 'from-purple-500 to-purple-600'
}

const normalizeStatName = (stat) => {
  if (stat === 'agility') return 'productivity'
  if (stat === 'luck') return 'consistency'
  return stat
}

const getStatLabel = (stat) => {
  const normalized = normalizeStatName(stat)
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

const getUserStatValue = (stats, stat) => {
  if (stat === 'agility') return stats?.productivity ?? stats?.agility ?? 0
  if (stat === 'luck') return stats?.consistency ?? stats?.luck ?? 0
  return stats?.[stat] ?? 0
}

const Skills = () => {
  const { user, updateUser } = useAuth()
  const { addNotification } = useNotifications()
  const [skills, setSkills] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [loading, setLoading] = useState(true)

  const categories = [
    { key: 'all', name: 'All Skills' },
    { key: 'health', name: 'Health' },
    { key: 'knowledge', name: 'Knowledge' },
    { key: 'productivity', name: 'Productivity' },
    { key: 'creativity', name: 'Creativity' }
  ]

  useEffect(() => {
    const fetchSkills = async () => {
      try {
        const params = selectedCategory !== 'all' ? { category: selectedCategory } : {}
        const response = await skillsAPI.getSkills(params)
        setSkills(response.data.data.skills)
      } catch (error) {
        console.error('Error loading skills:', error)
        toast.error('Failed to load skills')
      } finally {
        setLoading(false)
      }
    }

    fetchSkills()

    const reloadHandler = () => fetchSkills()
    window.addEventListener("reload-skills", reloadHandler)
    return () => window.removeEventListener("reload-skills", reloadHandler)
  }, [selectedCategory])

  const handleUnlockSkill = async (skill) => {
    try {
      const response = await skillsAPI.unlockSkill(skill._id)
      if (response.data.success) {
        // Update local skill state
        setSkills(prev => prev.map(s => 
          s._id === skill._id 
            ? { ...s, unlocked: true, level: 1, unlockedAt: new Date() }
            : s
        ))

        // Add notification
        addNotification({
          type: 'skill',
          title: '🔓 Skill Unlocked!',
          message: `You unlocked "${skill.name}"!`,
          persistent: false,
        })

        // Update user stats
        const { updatedStats } = response.data.data
        updateUser({
          character: {
            ...user.character,
            stats: updatedStats
          }
        })

        toast.success(`Skill "${skill.name}" unlocked!`)
      }
    } catch (error) {
      console.error('Error unlocking skill:', error)
      toast.error(error.response?.data?.message || 'Failed to unlock skill')
    }
  }

  const canUnlockSkill = (skill) => {
    if (typeof skill.canUnlock === 'boolean') {
      return skill.canUnlock
    }

    if (skill.unlocked) return false
    
    // Check level requirement
    if (user.character.level < skill.requirements.level) return false
    
    // Check stat requirements
    const userStats = user.character.stats
    for (const [stat, required] of Object.entries(skill.requirements.stats)) {
      if (getUserStatValue(userStats, stat) < required) return false
    }
    
    return true
  }

  const getSkillRequirementText = (skill) => {
    if (skill.lockReasons?.length) {
      return skill.lockReasons[0]
    }

    const requirements = []
    
    if (user.character.level < skill.requirements.level) {
      requirements.push(`Level ${skill.requirements.level}`)
    }
    
    const userStats = user.character.stats
    for (const [stat, required] of Object.entries(skill.requirements.stats)) {
      if (required > 0 && getUserStatValue(userStats, stat) < required) {
        requirements.push(`${required} ${normalizeStatName(stat)}`)
      }
    }
    
    return requirements.length > 0 ? `Requires: ${requirements.join(', ')}` : 'Requirements met!'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const filteredSkills = selectedCategory === 'all' 
    ? skills 
    : skills.filter(skill => skill.category === selectedCategory)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Skill Trees</h1>
        <p className="text-gray-400 mt-2">
          Unlock abilities to enhance your character and unlock new possibilities
        </p>
      </div>

      {/* Category Tabs */}
      <div className="flex space-x-1 bg-dark-800 p-1 rounded-lg">
        {categories.map((category) => (
          <button
            key={category.key}
            onClick={() => setSelectedCategory(category.key)}
            className={clsx(
              'flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors',
              selectedCategory === category.key
                ? 'bg-primary-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-dark-700'
            )}
          >
            {category.name}
          </button>
        ))}
      </div>

      {/* Skills Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSkills.map((skill, index) => (
          <motion.div
            key={skill._id}
            className={clsx(
              'card hover-lift relative overflow-hidden',
              skill.unlocked && 'border-success-500/50',
              canUnlockSkill(skill) && 'border-primary-500/50 animate-glow'
            )}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.02 }}
          >
            {/* Background Gradient */}
            <div className={clsx(
              'absolute inset-0 opacity-10 bg-gradient-to-br',
              categoryColors[skill.category]
            )} />
            
            {/* Content */}
            <div className="relative z-10">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="text-2xl mb-2">{skill.icon}</div>
                  <h3 className="font-semibold text-white">{skill.name}</h3>
                  <p className="text-sm text-gray-400 capitalize">
                    Tier {skill.tier} • {skill.category}
                  </p>
                </div>
                
                {/* Status Icon */}
                <div>
                  {skill.unlocked ? (
                    <CheckCircle className="h-6 w-6 text-success-400" />
                  ) : canUnlockSkill(skill) ? (
                    <Zap className="h-6 w-6 text-primary-400" />
                  ) : (
                    <Lock className="h-6 w-6 text-gray-500" />
                  )}
                </div>
              </div>

              {/* Description */}
              <p className="text-gray-300 text-sm mb-4">{skill.description}</p>

              {/* Effects */}
              {skill.effects && (
                <div className="mb-4">
                  <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                    Effects
                  </h4>
                  <div className="space-y-1">
                    {skill.effects.xpBonus > 0 && (
                      <div className="flex items-center text-xs text-accent-400">
                        <Star className="h-3 w-3 mr-1" />
                        +{skill.effects.xpBonus}% XP Bonus
                      </div>
                    )}
                    {Object.entries(skill.effects.statBonus).map(([stat, bonus]) => 
                      bonus > 0 && (
                        <div key={stat} className="flex items-center text-xs text-blue-400">
                          <Zap className="h-3 w-3 mr-1" />
                          +{bonus} {getStatLabel(stat)}
                        </div>
                      )
                    )}
                    {skill.effects.specialAbilities.map((ability, idx) => (
                      <div key={idx} className="flex items-center text-xs text-purple-400">
                        <Star className="h-3 w-3 mr-1" />
                        {ability}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Requirements & Action */}
              <div className="border-t border-dark-700 pt-4">
                <p className={clsx(
                  'text-xs mb-3',
                  canUnlockSkill(skill) ? 'text-success-400' : 'text-gray-400'
                )}>
                  {getSkillRequirementText(skill)}
                </p>

                {skill.unlocked ? (
                  <div className="flex items-center justify-between">
                    <span className="text-success-400 text-sm font-medium">
                      ✓ Unlocked
                    </span>
                    {skill.level && (
                      <span className="text-xs text-gray-400">
                        Level {skill.level}
                      </span>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => handleUnlockSkill(skill)}
                    disabled={!canUnlockSkill(skill)}
                    className={clsx(
                      'w-full btn text-sm',
                      canUnlockSkill(skill)
                        ? 'btn-primary'
                        : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    )}
                  >
                    {canUnlockSkill(skill) ? 'Unlock Skill' : 'Locked'}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredSkills.length === 0 && (
        <div className="card text-center py-12">
          <Zap className="h-16 w-16 text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No skills found</h3>
          <p className="text-gray-400">
            {selectedCategory === 'all'
              ? 'No skills available yet'
              : `No ${selectedCategory} skills available yet`
            }
          </p>
        </div>
      )}
    </div>
  )
}

export default Skills