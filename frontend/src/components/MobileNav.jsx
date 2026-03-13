import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, Target, Zap, Trophy, BarChart3, User } from 'lucide-react'
import clsx from 'clsx'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Quests', href: '/quests', icon: Target },
  { name: 'Skills', href: '/skills', icon: Zap },
  { name: 'Leaderboard', href: '/leaderboard', icon: Trophy },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Profile', href: '/profile', icon: User },
]

const MobileNav = () => {
  const location = useLocation()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-dark-700 bg-dark-800/95 backdrop-blur md:hidden">
      <div className="grid grid-cols-6">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href
          return (
            <Link
              key={item.name}
              to={item.href}
              className={clsx(
                'flex flex-col items-center justify-center py-2 text-[11px] transition-colors',
                isActive ? 'text-primary-400' : 'text-gray-400'
              )}
            >
              <item.icon className="mb-1 h-4 w-4" />
              <span>{item.name}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export default MobileNav