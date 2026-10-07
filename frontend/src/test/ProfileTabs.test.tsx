import { describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { API_BASE_URL } from '@/api/client'
import AccountTab from '@/components/AccountTab'
import ProfileTab from '@/components/ProfileTab'
import { authWrapper, makeAuthValue } from './renderWithAuth'
import { sampleProfile, server } from './server'

const PROFILE = { ...sampleProfile, latitude: 48.85, longitude: 2.35, location_label: 'Paris', location_consent: true }

function serveMyTagsAndPhotos() {
    server.use(
        http.get(`${API_BASE_URL}/users/me/tags`, () => HttpResponse.json([])),
        http.get(`${API_BASE_URL}/users/me/photos`, () => HttpResponse.json([])),
    )
}

function renderProfileTab(onSaved = vi.fn()) {
    const Wrapper = authWrapper(makeAuthValue())
    render(<Wrapper><ProfileTab profile={PROFILE} onSaved={onSaved} /></Wrapper>)
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
    const { container } = render(<Wrapper><AccountTab profile={PROFILE} onSaved={onSaved} /></Wrapper>)
    return { onSaved, container }
}

function changePassword(container: HTMLElement) {
    fireEvent.click(screen.getAllByRole('button', { name: 'vues' })[1])
    const [current, next, confirm] = container.querySelectorAll('input[type="password"]')
    fireEvent.change(current, { target: { value: 'Secret123' } })
    fireEvent.change(next, { target: { value: 'Better456' } })
    fireEvent.change(confirm, { target: { value: 'Better456' } })
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
}

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
})

describe('AccountTab', () => {
    it('does save the account and tell the page', async () => {
        server.use(http.patch(`${API_BASE_URL}/users/me/account`, () => HttpResponse.json(PROFILE)))

        const { onSaved } = renderAccountTab()
        fireEvent.click(screen.getAllByRole('button', { name: 'vues' })[0])
        fireEvent.click(screen.getByRole('button', { name: 'Save' }))

        await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1))
        expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
    })

    it('does send the passwords and close the password form when the password is changed', async () => {
        const sentBodies: unknown[] = []
        server.use(http.patch(`${API_BASE_URL}/users/me/password-change`, async ({ request }) => {
            sentBodies.push(await request.json())
            return HttpResponse.json({ message: 'Your password was changed.' })
        }))

        const { container } = renderAccountTab()
        changePassword(container)

        await waitFor(() => expect(screen.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument())
        expect(sentBodies).toEqual([
            { current_password: 'Secret123', new_password: 'Better456', confirm_password: 'Better456' },
        ])
    })

    it('does say the password change failed when the server cannot be reached', async () => {
        server.use(http.patch(`${API_BASE_URL}/users/me/password-change`, () => HttpResponse.error()))

        const { container } = renderAccountTab()
        changePassword(container)

        expect(await screen.findByText('Request failed')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument()
    })
})
