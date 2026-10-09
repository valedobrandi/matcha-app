import type { ReactNode } from 'react'
import { vi } from 'vitest'
import { AuthContext } from '@/auth/AuthContext'
import { QueryWrapper } from './QueryWrapper'

type AuthContextValue = React.ContextType<typeof AuthContext>

// Injectable auth state for tests. Defaults to an authenticated user with a
// token; override per test (e.g. accessToken: null, or spy on logout).
export function makeAuthValue(
  overrides: Partial<NonNullable<AuthContextValue>> = {},
): NonNullable<AuthContextValue> {
  return {
    accessToken: 'test-token',
    user: null,
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(async () => {}),
    loginWithToken: vi.fn(async () => {}),
    logout: vi.fn(),
    signOut: vi.fn(),
    refreshUser: vi.fn(async () => {}),
    ...overrides,
  }
}

// Wrapper for renderHook / render that supplies AuthContext directly —
// state is injected, not reached by driving the UI.
export function authWrapper(value: NonNullable<AuthContextValue>) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryWrapper>
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
      </QueryWrapper>
    )
  }
}
