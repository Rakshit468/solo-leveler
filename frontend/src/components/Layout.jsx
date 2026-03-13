import React from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import { useTheme } from '../contexts/ThemeContext'

const Layout = () => {
  const { theme } = useTheme();
  return (
    <div className={`min-h-screen flex ${theme === 'dark' ? 'bg-dark-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default Layout