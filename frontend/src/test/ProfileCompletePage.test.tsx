import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '@/auth/AuthContext'
import { API_BASE_URL } from '@/api/client'
import { ProfileCompletePage } from '@/pages/profile/ProfileCompletePage'
import { makeAuthValue } from './renderWithAuth'
import { sampleProfile, server } from './server'

describe('ProfileCompletePage', () => {
    it('does keep what the user typed when the profile is fetched again', async () => {
        let profileRequests = 0
        let storedAge: number | null = null
        server.use(
            http.get(`${API_BASE_URL}/users/me`, () => {
                profileRequests += 1
                return HttpResponse.json({
                    ...sampleProfile,
                    gender: null,
                    sexual_preference: null,
                    age: storedAge,
                    bio: null,
                    is_profile_completed: false,
                    last_connection: `2026-10-07T09:00:0${profileRequests}Z`,
                })
            }),
            http.get(`${API_BASE_URL}/users/me/photos`, () => HttpResponse.json([])),
            http.get(`${API_BASE_URL}/users/me/tags`, () => HttpResponse.json([])),
        )
        const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
        render(
            <QueryClientProvider client={queryClient}>
                <AuthContext.Provider value={makeAuthValue()}>
                    <MemoryRouter>
                        <ProfileCompletePage />
                    </MemoryRouter>
                </AuthContext.Provider>
            </QueryClientProvider>,
        )

        await screen.findByText('Welcome, user')
        const bio = screen.getByLabelText('Bio')
        fireEvent.change(bio, { target: { value: 'I like hiking' } })
        storedAge = 30
        await act(() => queryClient.invalidateQueries({ queryKey: ['me'] }))

        await waitFor(() => expect(screen.getByLabelText('Age')).toHaveValue(30))
        expect(bio).toHaveValue('I like hiking')
    })
})
