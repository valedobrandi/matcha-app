import { StrictMode } from 'react'
import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { API_BASE_URL } from '@/api/client'
import { VerifyEmailPage } from '@/pages/auth/VerifyEmailPage'
import { authWrapper, makeAuthValue } from './renderWithAuth'
import { server } from './server'

function serveSingleUseVerification() {
    const requestedTokens: string[] = []
    server.use(http.get(`${API_BASE_URL}/auth/verify/:token`, ({ params }) => {
        requestedTokens.push(String(params.token))
        if (requestedTokens.length > 1)
            return HttpResponse.json(
                { detail: 'Invalid or expired verification token.', code: 'INVALID_VERIFICATION_TOKEN' },
                { status: 400 },
            )
        return HttpResponse.json({ access_token: 'session-jwt', token_type: 'bearer' })
    }))
    return requestedTokens
}

describe('VerifyEmailPage', () => {
    it('does verify the link once and sign in when StrictMode runs the page effect twice', async () => {
        const requestedTokens = serveSingleUseVerification()
        const auth = makeAuthValue({ accessToken: null, isAuthenticated: false })
        const Wrapper = authWrapper(auth)

        render(
            <StrictMode>
                <Wrapper>
                    <MemoryRouter initialEntries={['/auth/verify?token=link-token']}>
                        <Routes>
                            <Route path="/auth/verify" element={<VerifyEmailPage />} />
                            <Route path="/" element={<p>Home</p>} />
                        </Routes>
                    </MemoryRouter>
                </Wrapper>
            </StrictMode>,
        )

        expect(await screen.findByText('Home')).toBeInTheDocument()
        expect(auth.loginWithToken).toHaveBeenCalledWith('session-jwt')
        expect(requestedTokens).toEqual(['link-token'])
    })
})
