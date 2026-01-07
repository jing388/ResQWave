import { useAuth } from '@/contexts/AuthContext'
import { Navigate } from 'react-router-dom'

interface ProtectedRouteProps {
  children: React.ReactNode
  adminOnly?: boolean
  dispatcherOnly?: boolean
}

export function ProtectedRoute({ children, adminOnly = false, dispatcherOnly = false }: ProtectedRouteProps) {
  const { user, isAdmin, isLoading } = useAuth()

  // Show loading state while validating token
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#171717]">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-white border-r-transparent"></div>
          <p className="mt-4 text-white/60">Loading...</p>
        </div>
      </div>
    )
  }

  // If not logged in, redirect to login
  if (!user) {
    return <Navigate to="/login-official" replace />
  }

  // If admin required but user is not admin, show access denied
  if (adminOnly && !isAdmin()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#171717] text-white">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="mb-6">
            <svg className="h-16 w-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-gray-300 mb-4">Dispatcher accounts cannot access admin features.</p>
          <div className="text-gray-400 text-sm">
            <p className="mb-2">Current account: <span className="font-medium text-white">{user.id}</span></p>
            <p>Role: <span className="font-medium text-white capitalize">{user.role}</span></p>
          </div>
        </div>
      </div>
    )
  }

  // If dispatcher required but user is admin, show access denied
  if (dispatcherOnly && isAdmin()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#171717] text-white">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="mb-6">
            <svg className="h-16 w-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-gray-300 mb-4">Admin accounts cannot access this feature. This page is for dispatchers only.</p>
          <div className="text-gray-400 text-sm">
            <p className="mb-2">Current account: <span className="font-medium text-white">{user.id}</span></p>
            <p>Role: <span className="font-medium text-white capitalize">{user.role}</span></p>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}