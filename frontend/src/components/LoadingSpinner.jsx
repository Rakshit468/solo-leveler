import React from 'react'
import clsx from 'clsx'

const LoadingSpinner = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  }

  return (
    <div className={clsx('animate-spin', sizeClasses[size], className)}>
      <div className="h-full w-full rounded-full border-4 border-gray-600 border-t-primary-500"></div>
    </div>
  )
}

export default LoadingSpinner