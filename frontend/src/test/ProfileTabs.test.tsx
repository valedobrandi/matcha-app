import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { fireEvent, render, screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react'
import { API_BASE_URL } from '@/api/client'
import AccountTab from '@/components/AccountTab'
import ProfileTab from '@/components/ProfileTab'
import { ProfileTabs } from '@/pages/profile/MyProfilePage'
import { authWrapper, makeAuthValue } from './renderWithAuth'
import { sampleProfile, server } from './server'

const PROFILE = { ...sampleProfile, latitude: 48.85, longitude: 2.35, location_label: 'Paris', location_consent: true }

function serveMyTagsAndPhotos() {
    server.use(
        http.get(`${API_BASE_URL}/users/me/tags`, () => HttpResponse.json([])),
        http.get(`${API_BASE_URL}/users/me/photos`, () => HttpResponse.json([])),
    )
}

function renderProfileTab(onSaved = vi.fn(), profile = PROFILE) {
    const Wrapper = authWrapper(makeAuthValue())
    render(<Wrapper><ProfileTab profile={profile} onSaved={onSaved} /></Wrapper>)
    fireEvent.click(screen.getByRole('button', { name: 'vues' }))
    return onSaved
}

function renderAccountTab(onSaved = vi.fn()) {
    const Wrapper = authWrapper(makeAuthValue({
        user: {
            id: 1, username: 'user', email: 'user@example.com', first_name: 'Test', last_name: 'User',
            email_verified: true, profile_completed: true, has_password: true,
        },
    }))
    render(<Wrapper><AccountTab profile={PROFILE} onSaved={onSaved} /></Wrapper>)
    return onSaved
}

function changePassword() {
    fireEvent.click(screen.getAllByRole('button', { name: 'vues' })[1])
    fireEvent.change(screen.getByLabelText('Current password'), { target: { value: 'Secret123' } })
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'Better456' } })
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'Better456' } })
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
}

const NOMINATIM_REVERSE = 'https://nominatim.openstreetmap.org/reverse'

function stubGeolocation(latitude: number, longitude: number) {
    Object.defineProperty(navigator, 'geolocation', {
        configurable: true,
        value: {
            getCurrentPosition: (onSuccess: PositionCallback) =>
                onSuccess({ coords: { latitude, longitude } } as GeolocationPosition),
        },
    })
}

describe('ProfileTab location from GPS', () => {
    beforeEach(() => {
        vi.stubGlobal('PointerEvent', class extends MouseEvent {})
        const fetchThroughMsw = globalThis.fetch
        vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
            fetchThroughMsw(input, { ...init, signal: undefined }))
    })

    afterEach(() => {
        vi.unstubAllGlobals()
        Reflect.deleteProperty(navigator, 'geolocation')
    })

    it('does save the neighborhood and city, not the street address, when the location comes from GPS', async () => {
        serveMyTagsAndPhotos()
        stubGeolocation(48.8584, 2.2945)
        let releaseGeocoding = () => {}
        const geocoding = new Promise<void>(resolve => { releaseGeocoding = resolve })
        const sentBodies: unknown[] = []
        server.use(
            http.get(NOMINATIM_REVERSE, async () => {
                await geocoding
                return HttpResponse.json({
                    display_name: 'Tour Eiffel, 5, Avenue Anatole France, Quartier du Gros-Caillou, Paris 7e Arrondissement, Paris, Île-de-France, France métropolitaine, 75007, France',
                    address: { quarter: 'Quartier du Gros-Caillou', suburb: 'Paris 7e Arrondissement', city_district: 'Paris', city: 'Paris' },
                })
            }),
            http.patch(`${API_BASE_URL}/users/me/profile`, async ({ request }) => {
                sentBodies.push(await request.json())
                return HttpResponse.json(PROFILE)
            }),
        )
        const onSaved = renderProfileTab(vi.fn(), { ...PROFILE, location_consent: false })

        fireEvent.click(screen.getByRole('switch', { name: 'Share your location' }))
        const locating = await screen.findByText('Getting your location...')
        releaseGeocoding()
        await waitForElementToBeRemoved(locating)
        fireEvent.click(screen.getByRole('button', { name: 'Save' }))

        await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1))
        expect(sentBodies).toEqual([expect.objectContaining({
            location_label: 'Quartier du Gros-Caillou, Paris',
            latitude: 48.8584,
            longitude: 2.2945,
            location_consent: true,
        })])
    })

    it('does ask for the location by hand when GPS finds no neighborhood or city', async () => {
        serveMyTagsAndPhotos()
        stubGeolocation(0, -30)
        server.use(http.get(NOMINATIM_REVERSE, () => HttpResponse.json({ display_name: 'Atlantic Ocean', address: {} })))
        renderProfileTab(vi.fn(), { ...PROFILE, location_consent: false })

        fireEvent.click(screen.getByRole('switch', { name: 'Share your location' }))

        expect(await screen.findByText('Could not get your location. Please enter it manually.')).toBeInTheDocument()
        expect(screen.getByLabelText('City or neighborhood')).toBeInTheDocument()
    })
})

describe('ProfileTabs', () => {
    it('does keep unsaved profile edits and edit mode when the user switches to the account tab and back', async () => {
        serveMyTagsAndPhotos()
        const Wrapper = authWrapper(makeAuthValue())
        render(<Wrapper><ProfileTabs profile={PROFILE} onSaved={vi.fn()} /></Wrapper>)

        fireEvent.click(screen.getByRole('button', { name: 'vues' }))
        fireEvent.change(screen.getByLabelText(/Bio/), { target: { value: 'Still typing' } })
        fireEvent.click(screen.getByRole('tab', { name: 'Account' }))
        fireEvent.click(await screen.findByRole('tab', { name: 'Profile' }))

        expect(await screen.findByLabelText(/Bio/)).toHaveValue('Still typing')
        expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
    })
})

describe('ProfileTab', () => {
    it('does save the profile, tell the page and leave edit mode', async () => {
        serveMyTagsAndPhotos()
        const sentBodies: unknown[] = []
        server.use(http.patch(`${API_BASE_URL}/users/me/profile`, async ({ request }) => {
            sentBodies.push(await request.json())
            return HttpResponse.json(PROFILE)
        }))

        const onSaved = renderProfileTab()
        fireEvent.click(screen.getByRole('button', { name: 'Save' }))

        await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1))
        expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
        expect(sentBodies).toEqual([expect.objectContaining({ age: 25, bio: 'hi', location_label: 'Paris' })])
    })

    it('does name the manual location field when the location is not shared', () => {
        serveMyTagsAndPhotos()

        renderProfileTab(vi.fn(), { ...PROFILE, location_consent: false })

        expect(screen.getByLabelText('City or neighborhood')).toHaveValue('Paris')
    })

    it('does show why the profile could not be saved and stay in edit mode', async () => {
        serveMyTagsAndPhotos()
        server.use(http.patch(`${API_BASE_URL}/users/me/profile`, () => HttpResponse.json(
            { detail: 'Bio is too long' },
            { status: 422 },
        )))

        const onSaved = renderProfileTab()
        fireEvent.click(screen.getByRole('button', { name: 'Save' }))

        expect(await screen.findByText('Bio is too long')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
        expect(onSaved).not.toHaveBeenCalled()
    })

    it('does say the profile could not be saved when the server cannot be reached', async () => {
        serveMyTagsAndPhotos()
        server.use(http.patch(`${API_BASE_URL}/users/me/profile`, () => HttpResponse.error()))

        const onSaved = renderProfileTab()
        fireEvent.click(screen.getByRole('button', { name: 'Save' }))

        expect(await screen.findByText('Could not save your profile, please try again')).toBeInTheDocument()
        expect(onSaved).not.toHaveBeenCalled()
    })
})

describe('AccountTab', () => {
    it('does save the fields edited through their labels and tell the page', async () => {
        const sentBodies: unknown[] = []
        server.use(http.patch(`${API_BASE_URL}/users/me/account`, async ({ request }) => {
            sentBodies.push(await request.json())
            return HttpResponse.json(PROFILE)
        }))

        const onSaved = renderAccountTab()
        fireEvent.click(screen.getAllByRole('button', { name: 'vues' })[0])
        fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'newname' } })
        fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'new@example.com' } })
        fireEvent.click(screen.getByRole('button', { name: 'Save' }))

        await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1))
        expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
        expect(sentBodies).toEqual([
            { username: 'newname', first_name: 'Test', last_name: 'User', email: 'new@example.com' },
        ])
    })

    it('does say the account could not be saved when the server cannot be reached', async () => {
        server.use(http.patch(`${API_BASE_URL}/users/me/account`, () => HttpResponse.error()))

        const onSaved = renderAccountTab()
        fireEvent.click(screen.getAllByRole('button', { name: 'vues' })[0])
        fireEvent.click(screen.getByRole('button', { name: 'Save' }))

        expect(await screen.findByText('Could not save your account, please try again')).toBeInTheDocument()
        expect(onSaved).not.toHaveBeenCalled()
    })

    it('does confirm the change and close the password form when the password is changed', async () => {
        const sentBodies: unknown[] = []
        server.use(http.patch(`${API_BASE_URL}/users/me/password-change`, async ({ request }) => {
            sentBodies.push(await request.json())
            return HttpResponse.json({ message: 'Your password was changed.' })
        }))

        renderAccountTab()
        changePassword()

        expect(await screen.findByText('Your password was changed.')).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument()
        expect(sentBodies).toEqual([
            { current_password: 'Secret123', new_password: 'Better456', confirm_password: 'Better456' },
        ])
    })

    it('does say the password change failed when the server cannot be reached', async () => {
        server.use(http.patch(`${API_BASE_URL}/users/me/password-change`, () => HttpResponse.error()))

        renderAccountTab()
        changePassword()

        expect(await screen.findByText('Request failed')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument()
    })
})
