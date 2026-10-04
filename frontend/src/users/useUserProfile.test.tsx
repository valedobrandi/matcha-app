import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server, sampleProfile } from '@/test/server'
import { API_BASE_URL, setOnUnauthorized } from '@/api/client'
import { makeAuthValue, authWrapper } from '@/test/renderWithAuth'
import useUserProfile from './useUserProfile'

// Reference shape for hook tests: real hook code runs unmodified against
// MSW-controlled responses; auth state is injected via context.
describe('useUserProfile', () => {
  it('loads the profile when a token is present', async () => {
    const { result } = renderHook(() => useUserProfile(), {
      wrapper: authWrapper(makeAuthValue()),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.profile).toEqual(sampleProfile)
    expect(result.current.error).toBeNull()
  })

  it('skips fetching and clears the profile when there is no token', async () => {
    const { result } = renderHook(() => useUserProfile(), {
      wrapper: authWrapper(makeAuthValue({ accessToken: null, isAuthenticated: false })),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.profile).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('surfaces a mapped error message when the API returns an error code', async () => {
    server.use(
      http.get(`${API_BASE_URL}/users/me`, () =>
        HttpResponse.json({ detail: 'boom', code: 'AUTH_ERROR' }, { status: 500 }),
      ),
    )

    const { result } = renderHook(() => useUserProfile(), {
      wrapper: authWrapper(makeAuthValue()),
    })

    await waitFor(() => expect(result.current.error).not.toBeNull())

    expect(result.current.error).toBe('Something went wrong. Please try again.')
    expect(result.current.profile).toBeNull()
  })

  it('logs out when the API reports USER_NOT_FOUND', async () => {
    server.use(
      http.get(`${API_BASE_URL}/users/me`, () =>
        HttpResponse.json({ detail: 'gone', code: 'USER_NOT_FOUND' }, { status: 401 }),
      ),
    )

    const logout = vi.fn()
    setOnUnauthorized(logout)
    const { result } = renderHook(() => useUserProfile(), {
      wrapper: authWrapper(makeAuthValue()),
    })

    await waitFor(() => expect(logout).toHaveBeenCalledOnce())
    setOnUnauthorized(null)
    expect(result.current.profile).toBeNull()
  })
})
