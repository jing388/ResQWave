/* eslint-disable react-refresh/only-export-components */
import type { LoginRequest, UnifiedVerificationRequest } from '@/pages/Official/LoginDispatcher/api'
import { ApiException, logout as apiLogout, getCurrentUser, unifiedLogin, unifiedVerifyLogin } from '@/pages/Official/LoginDispatcher/api'
import { setGlobalLogoutCallback } from '@/pages/Official/Reports/api/api'
import type { ReactNode } from 'react'
import { createContext, useContext, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

export interface User {
  id: string
  role: 'admin' | 'dispatcher'
  name: string
  email: string
}

interface AuthContextType {
  user: User | null
  login: (id: string, password: string) => Promise<boolean>
  verifyLogin: (verificationCode: string) => Promise<boolean>
  logout: () => Promise<void>
  isAdmin: () => boolean
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()
  const location = useLocation()

  // Register global logout callback for API 401/403 errors
  useEffect(() => {
    setGlobalLogoutCallback(() => {
      setUser(null)
      localStorage.removeItem('resqwave_token')
      localStorage.removeItem('resqwave_user')
      navigate('/login-official', { replace: true })
    })
  }, [navigate])

  // Validate token ONLY ONCE on mount
   
  useEffect(() => {
    const validateToken = async () => {
      // Skip token validation for focal routes (they have their own auth system)
      const isFocalRoute = location.pathname.startsWith('/focal') ||
        location.pathname.startsWith('/login-focal') ||
        location.pathname.startsWith('/verification-signin-focal') ||
        location.pathname.startsWith('/forgot-password-focal') ||
        location.pathname.startsWith('/register')

      if (isFocalRoute) {
        setIsLoading(false)
        return
      }

      const storedToken = localStorage.getItem('resqwave_token')
      const storedUser = localStorage.getItem('resqwave_user')

      // If no token, just set loading to false
      if (!storedToken) {
        setIsLoading(false)
        return
      }

      // Try to use stored user data first (faster UX)
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser)
          setUser(userData)
        } catch (error) {
          console.error('Failed to parse stored user data:', error)
        }
      }

      try {
        // Validate token with backend (but don't block UI)
        const userData = await getCurrentUser()

        const user: User = {
          id: userData.id,
          role: userData.role,
          name: userData.name || userData.id,
          email: userData.email
        }

        setUser(user)
        localStorage.setItem('resqwave_user', JSON.stringify(user))
      } catch (error) {
        console.error('Token validation failed:', error)
        
        // Only clear and redirect if it's actually an auth error
        if (error instanceof ApiException && (error.status === 401 || error.status === 403)) {
          localStorage.removeItem('resqwave_token')
          localStorage.removeItem('resqwave_user')
          setUser(null)
          
          // Only redirect if on a protected route
          const publicRoutes = ['/login-official', '/verification-official', '/', '/login-focal']
          if (!publicRoutes.includes(location.pathname)) {
            navigate('/login-official', { replace: true })
          }
        }
        // For other errors (network, etc.), keep user logged in but show they're offline
      } finally {
        setIsLoading(false)
      }
    }

    validateToken()
  }, [location.pathname, navigate]) // Include dependencies to satisfy ESLint

  // Step 1: Unified login (both admin and dispatcher with 2FA)
  const login = async (id: string, password: string): Promise<boolean> => {
    setIsLoading(true)
    try {
      const loginData: LoginRequest = { ID: id, password }
      const response = await unifiedLogin(loginData)

      // Both admin and dispatcher need 2FA verification
      sessionStorage.setItem('tempToken', response.tempToken)
      sessionStorage.setItem('userType', response.userType)

      setIsLoading(false)
      return true
    } catch (error) {
      setIsLoading(false)
      if (error instanceof ApiException) {
        throw new Error(error.message)
      }
      throw new Error('Login failed. Please try again.')
    }
  }

  // Step 2: Unified verification (both admin and dispatcher)
  const verifyLogin = async (verificationCode: string): Promise<boolean> => {
    setIsLoading(true)
    try {
      const tempToken = sessionStorage.getItem('tempToken')

      if (!tempToken) {
        throw new Error('Session expired. Please login again.')
      }

      const verificationData: UnifiedVerificationRequest = {
        tempToken,
        code: verificationCode
      }

      const response = await unifiedVerifyLogin(verificationData)

      // Store token and user data
      localStorage.setItem('resqwave_token', response.token)

      const userData: User = {
        id: response.user.id,
        role: response.user.role,
        name: response.user.name || response.user.id,
        email: response.user.email
      }

      setUser(userData)
      localStorage.setItem('resqwave_user', JSON.stringify(userData))

      // Clear temporary data
      sessionStorage.removeItem('tempToken')
      sessionStorage.removeItem('userType')

      setIsLoading(false)
      return true
    } catch (error) {
      setIsLoading(false)
      if (error instanceof ApiException) {
        throw new Error(error.message)
      }
      throw new Error('Verification failed. Please try again.')
    }
  }

  const logout = async () => {
    setIsLoading(true)
    try {
      // Call backend logout (which also clears local storage)
      await apiLogout()

      // Clear user state
      setUser(null)

      // Navigate to login
      navigate('/login-official', { replace: true })
    } catch (error) {
      console.error('Logout error:', error)
      // Even if backend call fails, clear local state
      setUser(null)
      navigate('/login-official', { replace: true })
    } finally {
      setIsLoading(false)
    }
  }

  const isAdmin = (): boolean => {
    return user?.role === 'admin'
  }

  return (
    <AuthContext.Provider value={{
      user,
      login,
      verifyLogin,
      logout,
      isAdmin,
      isLoading
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}