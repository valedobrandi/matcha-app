import { describe, it, expect } from 'vitest'
import { http, HttpResponse } from 'msw'
import { fireEvent, render, screen } from '@testing-library/react'
import { server } from './server'
import { API_BASE_URL } from '../api/client'
import { AuthProvider } from '../auth/AuthProvider'
import { QueryWrapper } from './QueryWrapper'
import { useAuth } from '../auth/useAuth'
import { getAccessToken, setAccessToken } from '../auth/tokenStorage'

const ME_URL = `${API_BASE_URL}/auth/me`

const ME = {
  id: 1, username: 'alice', email: 'alice@example.test', first_name: 'A', last_name: 'B',
  email_verified: true, profile_completed: true, has_password: true,
}

function Probe() {
  const { user, isLoading, isAuthenticated, logout, refreshUser } = useAuth()
  return (
    <>
      <p data-testid="state">
        {isLoading ? 'loading' : user ? `user:${user.username}` : isAuthenticated ? 'token-only' : 'anonymous'}
      </p>
      <button onClick={logout}>logout</button>
      <button onClick={() => void refreshUser()}>refresh</button>
    </>
  )
}

function renderProvider() {
  return render(
    <QueryWrapper>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </QueryWrapper>,
  )
}

describe('AuthProvider', () => {
  it('does load the current user when a token is stored', async () => {
    setAccessToken('stored-token')
    server.use(http.get(ME_URL, () => HttpResponse.json(ME)))

    renderProvider()

    expect(await screen.findByText('user:alice')).toBeInTheDocument()
  })

  it('does clear the stored token when the API rejects it with 401', async () => {
    setAccessToken('stale-token')
    server.use(
      http.get(ME_URL, () => HttpResponse.json({ detail: 'expired', code: 'EXPIRED_TOKEN' }, { status: 401 })),
    )

    renderProvider()

    expect(await screen.findByText('anonymous')).toBeInTheDocument()
    expect(getAccessToken()).toBeNull()
  })

  it('does not call the API when no token is stored', async () => {
    let calls = 0
    server.use(
      http.get(ME_URL, () => {
        calls++
        return HttpResponse.json(ME)
      }),
    )

    renderProvider()

    expect(await screen.findByText('anonymous')).toBeInTheDocument()
    expect(calls).toBe(0)
  })

  it('does return to anonymous and clear the token when the user logs out', async () => {
    setAccessToken('stored-token')
    server.use(http.get(ME_URL, () => HttpResponse.json(ME)))
    renderProvider()
    await screen.findByText('user:alice')

    fireEvent.click(screen.getByRole('button', { name: 'logout' }))

    expect(await screen.findByText('anonymous')).toBeInTheDocument()
    expect(getAccessToken()).toBeNull()
  })

  it('does show the new profile state when the user is refreshed', async () => {
    setAccessToken('stored-token')
    let completed = false
    server.use(http.get(ME_URL, () => HttpResponse.json({ ...ME, profile_completed: completed })))
    function Completed() {
      return <p>{useAuth().user?.profile_completed ? 'completed' : 'incomplete'}</p>
    }
    render(
      <QueryWrapper>
        <AuthProvider>
          <Probe />
          <Completed />
        </AuthProvider>
      </QueryWrapper>,
    )
    await screen.findByText('incomplete')

    completed = true
    fireEvent.click(screen.getByRole('button', { name: 'refresh' }))

    expect(await screen.findByText('completed')).toBeInTheDocument()
  })
})
