import { describe, it, expect, vi, afterEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import { API_BASE_URL, ApiError, apiGet, setOnUnauthorized } from './client'

describe('apiGet', () => {
  afterEach(() => setOnUnauthorized(null))

  it('does log out once when the API reports USER_NOT_FOUND', async () => {
    server.use(
      http.get(`${API_BASE_URL}/probe`, () =>
        HttpResponse.json({ detail: 'gone', code: 'USER_NOT_FOUND' }, { status: 404 }),
      ),
    )
    const logout = vi.fn()
    setOnUnauthorized(logout)

    await expect(apiGet('/probe', { token: 't' })).rejects.toBeInstanceOf(ApiError)

    expect(logout).toHaveBeenCalledTimes(1)
  })

  it('does not log out when the API reports TARGET_USER_NOT_FOUND', async () => {
    server.use(
      http.get(`${API_BASE_URL}/probe`, () =>
        HttpResponse.json({ detail: 'gone', code: 'TARGET_USER_NOT_FOUND' }, { status: 404 }),
      ),
    )
    const logout = vi.fn()
    setOnUnauthorized(logout)

    await expect(apiGet('/probe', { token: 't' })).rejects.toBeInstanceOf(ApiError)

    expect(logout).not.toHaveBeenCalled()
  })
})
