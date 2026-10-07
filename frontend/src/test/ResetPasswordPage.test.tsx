import { describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { API_BASE_URL } from '@/api/client'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'
import { authWrapper, makeAuthValue } from './renderWithAuth'
import { server } from './server'

const RESET_URL = `${API_BASE_URL}/auth/reset-password`

function saveNewPassword(authValue = makeAuthValue({ accessToken: null, isAuthenticated: false })) {
    const Wrapper = authWrapper(authValue)
    render(
        <Wrapper>
            <MemoryRouter initialEntries={['/auth/reset-password?token=reset-123']}>
                <Routes>
                    <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
                    <Route path="/" element={<p>Home</p>} />
                </Routes>
            </MemoryRouter>
        </Wrapper>,
    )
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'Secret123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }))
}

describe('ResetPasswordPage', () => {
    it('does sign the user in and open the home page when the new password is saved', async () => {
        const sentBodies: unknown[] = []
        server.use(http.post(RESET_URL, async ({ request }) => {
            sentBodies.push(await request.json())
            return HttpResponse.json({ access_token: 'fresh-token', token_type: 'bearer', message: 'Password updated' })
        }))
        const loginWithToken = vi.fn(async () => {})

        saveNewPassword(makeAuthValue({ accessToken: null, isAuthenticated: false, loginWithToken }))

        expect(await screen.findByText('Home')).toBeInTheDocument()
        expect(loginWithToken).toHaveBeenCalledWith('fresh-token')
        expect(sentBodies).toEqual([{ token: 'reset-123', password: 'Secret123' }])
    })

    it('does explain an expired reset link', async () => {
        server.use(http.post(RESET_URL, () => HttpResponse.json(
            { detail: 'Invalid token', code: 'INVALID_RESET_TOKEN' },
            { status: 400 },
        )))

        saveNewPassword()

        expect(await screen.findByText('Invalid or expired password reset token.')).toBeInTheDocument()
    })
})
