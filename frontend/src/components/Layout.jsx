import React from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import MobileNav from './MobileNav'
import GlobalFocusTimer from './GlobalFocusTimer'

const Layout = () => {
  return (
    <div className="min-h-screen bg-dark-900 md:flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <GlobalFocusTimer />
        <main className="flex-1 overflow-y-auto p-4 pb-24 sm:p-5 md:p-6 md:pb-6">
          <Outlet />
        </main>
      </div>
      <MobileNav />
    </div>
  )
}

export default Layout