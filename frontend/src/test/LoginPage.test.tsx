import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { API_BASE_URL } from '@/api/client'
import { AuthProvider } from '@/auth/AuthProvider'
import { getAccessToken } from '@/auth/tokenStorage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { QueryWrapper } from './QueryWrapper'
import { server } from './server'

const LOGIN_URL = `${API_BASE_URL}/auth/login`

function renderLogin() {
    render(
        <QueryWrapper>
            <AuthProvider>
                <MemoryRouter initialEntries={['/auth/login']}>
                    <Routes>
                        <Route path="/auth/login" element={<LoginPage />} />
                        <Route path="/" element={<p>Home</p>} />
                    </Routes>
                </MemoryRouter>
            </AuthProvider>
        </QueryWrapper>,
    )
}

function submitCredentials() {
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'alice' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Secret123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Login' }))
}

describe('LoginPage', () => {
    it('does open the home page with the new token when the credentials are accepted', async () => {
        server.use(
            http.post(LOGIN_URL, () => HttpResponse.json({ access_token: 'new-token', token_type: 'bearer' })),
            http.get(`${API_BASE_URL}/auth/me`, () => HttpResponse.json({
                id: 1, username: 'alice', email: 'alice@example.test', first_name: 'Alice', last_name: 'Smith',
                email_verified: true, profile_completed: true, has_password: true,
            })),
        )

        renderLogin()
        submitCredentials()

        expect(await screen.findByText('Home')).toBeInTheDocument()
        expect(getAccessToken()).toBe('new-token')
    })

    it('does offer a new verification email when the account is not verified', async () => {
        server.use(http.post(LOGIN_URL, () => HttpResponse.json(
            { detail: 'Account not verified', code: 'ACCOUNT_NOT_VERIFIED' },
            { status: 403 },
        )))

        renderLogin()
        submitCredentials()

        expect(await screen.findByText('This account has not been verified via email yet.')).toBeInTheDocument()
        expect(screen.getByRole('link', { name: 'Resend verification email' })).toBeInTheDocument()
    })

    it('does ask the user to wait when the server refuses too many attempts', async () => {
        server.use(http.post(LOGIN_URL, () => HttpResponse.json(
            { detail: 'Too many attempts. Please wait and try again.', code: 'TOO_MANY_REQUESTS', field: null },
            { status: 429, headers: { 'Retry-After': '60' } },
        )))

        renderLogin()
        submitCredentials()

        expect(await screen.findByText('Too many attempts. Please wait a few minutes and try again.')).toBeInTheDocument()
    })

    it('does say the login failed when the server cannot be reached', async () => {
        server.use(http.post(LOGIN_URL, () => HttpResponse.error()))

        renderLogin()
        submitCredentials()

        expect(await screen.findByText('Login failed')).toBeInTheDocument()
        expect(screen.queryByRole('link', { name: 'Resend verification email' })).not.toBeInTheDocument()
    })
})
