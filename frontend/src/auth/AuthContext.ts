import { createContext } from 'react'
import type { CurrentUser, LoginInput } from '../types/auth'

export type AuthContextValue = {
  accessToken: string | null
  user: CurrentUser | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (payload: LoginInput) => Promise<void>
  loginWithToken: (token: string) => void
  logout: () => void
  refreshUser: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
