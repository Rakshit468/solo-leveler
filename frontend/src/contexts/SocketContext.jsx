import React, { createContext, useContext, useEffect, useState } from 'react'
import io from 'socket.io-client'
import { useAuth } from './AuthContext'
import toast from 'react-hot-toast'

const SocketContext = createContext()

export const useSocket = () => {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null)
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000')
      
      newSocket.on('connect', () => {
        console.log('🔌 Connected to server')
        newSocket.emit('join', user.id)
      })

      newSocket.on('questCompleted', (data) => {
        if (data.userId !== user.id) {
          toast(`🎉 ${data.questTitle} completed by another user!`, {
            duration: 3000
          })
        }
      })

      newSocket.on('levelUp', (data) => {
        if (data.userId !== user.id) {
          toast(`⭐ Someone leveled up to Level ${data.newLevel}!`, {
            duration: 3000
          })
        }
      })

      newSocket.on('leaderboardUpdate', () => {
        // Refresh leaderboard data if needed
        console.log('📊 Leaderboard updated')
      })

      newSocket.on('disconnect', () => {
        console.log('🔌 Disconnected from server')
      })

      setSocket(newSocket)

      return () => {
        newSocket.close()
        setSocket(null)
      }
    }
  }, [user])

  const emitEvent = (event, data) => {
    if (socket) {
      socket.emit(event, data)
    }
  }

  const value = {
    socket,
    emitEvent
  }

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  )
}