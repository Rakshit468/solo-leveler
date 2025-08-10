import React from 'react'
import { motion } from 'framer-motion'

const StatCard = ({ title, value, subtitle, icon: Icon, color = 'primary', trend }) => {
  const colorClasses = {
    primary: 'from-primary-500 to-primary-600',
    secondary: 'from-secondary-500 to-secondary-600',
    success: 'from-success-500 to-success-600',
    warning: 'from-warning-500 to-warning-600',
    error: 'from-error-500 to-error-600'
  }

  return (
    <motion.div 
      className="card hover-lift"
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
          {subtitle && (
            <p className="text-gray-500 text-sm mt-1">{subtitle}</p>
          )}
          {trend && (
            <p className={`text-sm mt-2 ${trend.positive ? 'text-success-500' : 'text-error-500'}`}>
              {trend.positive ? '↗' : '↘'} {trend.value}
            </p>
          )}
        </div>
        {Icon && (
          <div className={`p-3 rounded-lg bg-gradient-to-r ${colorClasses[color]}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default StatCard