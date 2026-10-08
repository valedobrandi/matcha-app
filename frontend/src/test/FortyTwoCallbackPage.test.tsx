import { StrictMode } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { API_BASE_URL } from '@/api/client'
import { createOAuthState } from '@/auth/oauthState'
import { FortyTwoCallbackPage } from '@/pages/auth/FortyTwoCallbackPage'
import { authWrapper, makeAuthValue } from './renderWithAuth'
import { server } from './server'

function serveSingleUseCodeExchange() {
    const exchangedCodes: string[] = []
    server.use(http.post(`${API_BASE_URL}/auth/callback/42`, ({ request }) => {
        exchangedCodes.push(new URL(request.url).searchParams.get('code') ?? '')
        if (exchangedCodes.length > 1)
            return HttpResponse.json({ detail: 'OAuth exchange failed.' }, { status: 400 })
        return HttpResponse.json({ access_token: 'session-jwt', token_type: 'bearer' })
    }))
    return exchangedCodes
}

afterEach(() => {
    sessionStorage.clear()
})

describe('FortyTwoCallbackPage', () => {
    it('does exchange the code once and sign in when StrictMode runs the page effect twice', async () => {
        const exchangedCodes = serveSingleUseCodeExchange()
        const state = createOAuthState()
        const auth = makeAuthValue({ accessToken: null, isAuthenticated: false })
        const Wrapper = authWrapper(auth)

        render(
            <StrictMode>
                <Wrapper>
                    <MemoryRouter initialEntries={[`/auth/callback/42?code=one-time-code&state=${state}`]}>
                        <Routes>
                            <Route path="/auth/callback/42" element={<FortyTwoCallbackPage />} />
                            <Route path="/" element={<p>Home</p>} />
                        </Routes>
                    </MemoryRouter>
                </Wrapper>
            </StrictMode>,
        )

        expect(await screen.findByText('Home')).toBeInTheDocument()
        expect(auth.loginWithToken).toHaveBeenCalledWith('session-jwt')
        expect(exchangedCodes).toEqual(['one-time-code'])
    })
})
