import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { CurrentUser, LoginInput } from '../types/auth'
import * as authApi from '../api/auth'
import { ApiError, setOnUnauthorized } from '../api/client'
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from './tokenStorage'
import { AuthContext } from './AuthContext'

type AuthProviderProps = {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [accessToken, setToken] = useState<string | null>(() =>
    getAccessToken(),
  )
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [isLoading, setIsLoading] = useState(() => getAccessToken() !== null)

  const refreshUser = useCallback(async () => {
    const token = getAccessToken()
    if (!token) {
      setUser(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const me = await authApi.getMe(token)
      setUser(me)
      setToken(token)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearAccessToken()
        setToken(null)
        setUser(null)
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loginWithToken = useCallback(
    (token: string) => {
      setAccessToken(token)
      setToken(token)
      setIsLoading(true)
      void refreshUser()
    },
    [refreshUser],
  )

  const logout = useCallback(() => {
    clearAccessToken()
    setToken(null)
    setUser(null)
  }, [])

  useEffect(() => {
    void refreshUser()
  }, [refreshUser])

  useEffect(() => {
    setOnUnauthorized(logout)
    return () => setOnUnauthorized(null)
  }, [logout])

  const login = useCallback(
    async (payload: LoginInput) => {
      const response = await authApi.login(payload)
      loginWithToken(response.access_token)
    },
    [loginWithToken],
  )

  const value = useMemo(
    () => ({
      accessToken,
      user,
      isAuthenticated: accessToken !== null,
      isLoading,
      login,
      loginWithToken,
      logout,
      refreshUser,
    }),
    [accessToken, user, isLoading, login, loginWithToken, logout, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
