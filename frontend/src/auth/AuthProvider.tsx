import {
  createContext,
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import * as authApi from '../api/auth'
import type { LoginInput } from '../types/auth'
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from './tokenStorage'

type AuthContextValue = {
  accessToken: string | null
  isAuthenticated: boolean
  login: (payload: LoginInput) => Promise<void>
  loginWithToken: (token: string) => void
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

type AuthProviderProps = {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [accessToken, setToken] = useState<string | null>(() =>
    getAccessToken(),
  )

  const loginWithToken = useCallback((token: string) => {
    setAccessToken(token)
    setToken(token)
  }, [])

  const login = useCallback(
    async (payload: LoginInput) => {
      const response = await authApi.login(payload)
      loginWithToken(response.access_token)
    },
    [loginWithToken],
  )

  const logout = useCallback(() => {
    clearAccessToken()
    setToken(null)
  }, [])

  const value = useMemo(
    () => ({
      accessToken,
      isAuthenticated: accessToken !== null,
      login,
      loginWithToken,
      logout,
    }),
    [accessToken, login, loginWithToken, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
