import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Target, Calendar, Star } from 'lucide-react'
import { questAPI } from '../services/api'
import toast from 'react-hot-toast'

const CreateQuestModal = ({ onClose, onQuestCreate }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'productivity',
    type: 'custom',
    difficulty: 'medium',
    dueDate: '',
    startTime: '',
    endTime: '',
    priority: 'medium',
    tags: ''
  })
  const [loading, setLoading] = useState(false)

  const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      if ((formData.startTime || formData.endTime) && !formData.dueDate) {
        toast.error('Please choose a due date when using time slots')
        setLoading(false)
        return
      }

      if (formData.startTime && formData.endTime && formData.endTime <= formData.startTime) {
        toast.error('End time must be later than start time')
        setLoading(false)
        return
      }

      const dueDateISO = formData.dueDate
        ? new Date(`${formData.dueDate}T00:00:00`).toISOString()
        : undefined

      const startDateTime =
        formData.dueDate && formData.startTime
          ? new Date(`${formData.dueDate}T${formData.startTime}:00`).toISOString()
          : undefined

      const endDateTime =
        formData.dueDate && formData.endTime
          ? new Date(`${formData.dueDate}T${formData.endTime}:00`).toISOString()
          : undefined

      const questData = {
        ...formData,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        dueDate: dueDateISO,
        startDateTime,
        endDateTime,
        timezone: browserTimezone,
      }

      delete questData.startTime
      delete questData.endTime

      const response = await questAPI.createQuest(questData)
      if (response.data.success) {
        onQuestCreate(response.data.data)
      }
    } catch (error) {
      console.error('Error creating quest:', error)
      toast.error('Failed to create quest')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div 
        className="bg-dark-800 rounded-xl p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto border border-dark-700"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Target className="h-6 w-6 text-primary-500" />
            <h2 className="text-xl font-semibold text-white">Create New Quest</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Quest Title *
            </label>
            <input
              type="text"
              name="title"
              required
              className="input"
              placeholder="e.g., Complete 30 minutes of exercise"
              value={formData.title}
              onChange={handleChange}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Description
            </label>
            <textarea
              name="description"
              className="input"
              rows="3"
              placeholder="Add more details about this quest..."
              value={formData.description}
              onChange={handleChange}
            />
          </div>

          {/* Category & Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Category
              </label>
              <select name="category" className="input" value={formData.category} onChange={handleChange}>
                <option value="health">Health</option>
                <option value="knowledge">Knowledge</option>
                <option value="productivity">Productivity</option>
                <option value="creativity">Creativity</option>
                <option value="social">Social</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Type
              </label>
              <select name="type" className="input" value={formData.type} onChange={handleChange}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="boss">Boss Battle</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>

          {/* Difficulty & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Difficulty
              </label>
              <select name="difficulty" className="input" value={formData.difficulty} onChange={handleChange}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
                <option value="legendary">Legendary</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Priority
              </label>
              <select name="priority" className="input" value={formData.priority} onChange={handleChange}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          {/* Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Due Date
            </label>
            <input
              type="date"
              name="dueDate"
              className="input"
              value={formData.dueDate}
              onChange={handleChange}
            />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Start Time
              </label>
              <input
                type="time"
                name="startTime"
                className="input"
                value={formData.startTime}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                End Time
              </label>
              <input
                type="time"
                name="endTime"
                className="input"
                value={formData.endTime}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Tags
            </label>
            <input
              type="text"
              name="tags"
              className="input"
              placeholder="fitness, morning, routine (comma separated)"
              value={formData.tags}
              onChange={handleChange}
            />
          </div>

          {/* XP Preview */}
          <div className="bg-dark-700 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Estimated XP Reward:</span>
              <div className="flex items-center space-x-1">
                <Star className="h-4 w-4 text-accent-500" />
                <span className="font-semibold text-accent-500">
                  {(() => {
                    const baseXP = { easy: 25, medium: 50, hard: 100, legendary: 250 }
                    const typeMultiplier = { daily: 1, weekly: 3, boss: 5, custom: 1 }
                    return baseXP[formData.difficulty] * typeMultiplier[formData.type]
                  })()} XP
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:space-x-3 sm:gap-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn btn-outline"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 btn-primary"
            >
              {loading ? (
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
              ) : (
                'Create Quest'
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

export default CreateQuestModal