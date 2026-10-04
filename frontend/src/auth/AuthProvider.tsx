import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { LoginInput } from '../types/auth'
import * as authApi from '../api/auth'
import { setOnUnauthorized } from '../api/client'
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
  const queryClient = useQueryClient()
  const [accessToken, setToken] = useState<string | null>(() =>
    getAccessToken(),
  )
  const me = useQuery({
    queryKey: ['auth-me', accessToken],
    queryFn: () => authApi.getMe(accessToken!),
    enabled: accessToken !== null,
  })
  const user = accessToken !== null ? (me.data ?? null) : null
  const isLoading = accessToken !== null && me.isPending
  const { refetch } = me

  const refreshUser = useCallback(async () => {
    if (accessToken !== null) await refetch()
  }, [accessToken, refetch])

  const loginWithToken = useCallback(async (token: string) => {
    setAccessToken(token)
    setToken(token)
  }, [])

  const logout = useCallback(() => {
    clearAccessToken()
    setToken(null)
    queryClient.removeQueries({ queryKey: ['auth-me'] })
  }, [queryClient])

  useEffect(() => {
    setOnUnauthorized(logout)
    return () => setOnUnauthorized(null)
  }, [logout])

  const login = useCallback(
    async (payload: LoginInput) => {
      const response = await authApi.login(payload)
      await loginWithToken(response.access_token)
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
