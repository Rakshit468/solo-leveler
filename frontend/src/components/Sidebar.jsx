import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  Home, 
  Sword, 
  Zap, 
  Trophy, 
  BarChart3, 
  User,
  Target
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import clsx from 'clsx'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Quests', href: '/quests', icon: Target },
  { name: 'Skills', href: '/skills', icon: Zap },
  { name: 'Leaderboard', href: '/leaderboard', icon: Trophy },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Profile', href: '/profile', icon: User },
]

const Sidebar = () => {
  const location = useLocation()
  const { user } = useAuth()

  return (
    <div className="w-64 bg-dark-800 border-r border-dark-700 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-dark-700">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <Sword className="h-8 w-8 text-primary-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold gradient-text">Solo Leveling</h1>
            <p className="text-sm text-gray-400">Self Improvement</p>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="p-6 border-b border-dark-700">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary-500 to-secondary-500 flex items-center justify-center">
            <span className="text-sm font-semibold text-white">
              {user?.character?.name?.charAt(0) || user?.username?.charAt(0) || 'U'}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-white">
              {user?.character?.name || user?.username}
            </p>
            <p className="text-xs text-gray-400">
              Level {user?.character?.level} • {user?.character?.xp} XP
            </p>
          </div>
        </div>
        
        {/* XP Progress Bar */}
        <div className="mt-3">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>XP Progress</span>
            <span>{user?.character?.xp}/{user?.character?.xpToNextLevel}</span>
          </div>
          <div className="progress-bar h-2">
            <div 
              className="progress-fill" 
              style={{ 
                width: `${(user?.character?.xp / user?.character?.xpToNextLevel) * 100}%` 
              }}
            ></div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href
          return (
            <Link
              key={item.name}
              to={item.href}
              className={clsx(
                'group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-colors',
                isActive
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-300 hover:bg-dark-700 hover:text-white'
              )}
            >
              <item.icon
                className={clsx(
                  'mr-3 h-5 w-5 flex-shrink-0',
                  isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'
                )}
              />
              {item.name}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

export default Sidebar