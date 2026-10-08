import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { delay, http, HttpResponse } from 'msw'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '@/auth/AuthContext'
import { API_BASE_URL } from '@/api/client'
import { ProfileCompletePage } from '@/pages/profile/ProfileCompletePage'
import { makeAuthValue } from './renderWithAuth'
import { sampleProfile, server } from './server'

function renderWizard() {
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
}

const SAVED_PROFILE = { ...sampleProfile, gender: 'male', sexual_preference: null, age: 30, bio: 'hi', is_profile_completed: false }

function serveSavedBasics() {
    server.use(
        http.get(`${API_BASE_URL}/users/me`, () => HttpResponse.json(SAVED_PROFILE)),
        http.patch(`${API_BASE_URL}/users/me`, () => HttpResponse.json(SAVED_PROFILE)),
        http.get(`${API_BASE_URL}/users/me/photos`, () => HttpResponse.json([])),
        http.get(`${API_BASE_URL}/users/me/tags`, () => HttpResponse.json([])),
    )
}

async function openLocationStep() {
    renderWizard()
    await waitFor(() => expect(screen.getByLabelText('Age')).toHaveValue(30))
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    return screen.findByLabelText('City or neighborhood')
}

describe('ProfileCompletePage location step', () => {
    beforeEach(() => {
        const fetchThroughMsw = globalThis.fetch
        vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
            fetchThroughMsw(input, { ...init, signal: undefined }))
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('does save the city typed by hand and open the tags step when the user does not share the position', async () => {
        serveSavedBasics()
        const sentLocations: unknown[] = []
        server.use(
            http.get('https://nominatim.openstreetmap.org/search', () =>
                HttpResponse.json([{ lat: '45.7578137', lon: '4.8320114' }])),
            http.patch(`${API_BASE_URL}/users/me/location`, async ({ request }) => {
                sentLocations.push(await request.json())
                return HttpResponse.json(SAVED_PROFILE)
            }),
        )
        const city = await openLocationStep()

        fireEvent.change(city, { target: { value: 'Lyon' } })
        fireEvent.blur(city)
        expect(await screen.findByText('Your location: Lyon')).toBeInTheDocument()
        fireEvent.click(screen.getByRole('button', { name: 'Next' }))

        expect(await screen.findByLabelText('Choose your personal tags:')).toBeInTheDocument()
        expect(sentLocations).toEqual([{ latitude: 45.7578137, longitude: 4.8320114, location_label: 'Lyon', location_consent: false }])
    })

    it('does keep the user on the location step when no location is given', async () => {
        serveSavedBasics()
        await openLocationStep()

        fireEvent.click(screen.getByRole('button', { name: 'Next' }))

        expect(await screen.findByText('Please enter your location manually or enable location sharing.')).toBeInTheDocument()
        expect(screen.queryByLabelText('Choose your personal tags:')).not.toBeInTheDocument()
    })
})

describe('ProfileCompletePage', () => {
    it('does open the location step as soon as the profile is saved, without waiting for the profile to reload', async () => {
        let profileRequests = 0
        const savedProfile = { ...sampleProfile, gender: 'male', sexual_preference: null, age: 30, bio: 'hi', is_profile_completed: false }
        server.use(
            http.get(`${API_BASE_URL}/users/me`, async () => {
                profileRequests += 1
                if (profileRequests > 1) await delay('infinite')
                return HttpResponse.json(savedProfile)
            }),
            http.patch(`${API_BASE_URL}/users/me`, () => HttpResponse.json(savedProfile)),
            http.get(`${API_BASE_URL}/users/me/photos`, () => HttpResponse.json([])),
            http.get(`${API_BASE_URL}/users/me/tags`, () => HttpResponse.json([])),
        )
        renderWizard()

        await waitFor(() => expect(screen.getByLabelText('Age')).toHaveValue(30))
        fireEvent.click(screen.getByRole('button', { name: 'Next' }))

        expect(await screen.findByLabelText('City or neighborhood')).toBeInTheDocument()
        expect(profileRequests).toBe(2)
    })

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
