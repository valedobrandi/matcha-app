import { createContext } from 'react'
import type { LoginInput } from '../types/auth'

export type AuthContextValue = {
  accessToken: string | null
  isAuthenticated: boolean
  login: (payload: LoginInput) => Promise<void>
  loginWithToken: (token: string) => void
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
