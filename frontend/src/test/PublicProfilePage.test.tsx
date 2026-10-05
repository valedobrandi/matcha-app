import { describe, it, expect } from 'vitest'
import { http, HttpResponse } from 'msw'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { server } from './server'
import { authWrapper, makeAuthValue } from './renderWithAuth'
import { API_BASE_URL } from '../api/client'
import PublicProfilePage from '../pages/profile/PublicProfilePage'

const PROFILE = {
    id: 5, username: 'bob', first_name: 'Bob', last_name: 'B', gender: 'male',
    sexual_preference: 'female', age: 30, bio: 'hello there', fame_rating: 50,
    location_label: 'Paris', last_connection: null, is_online: false,
    tags: [], photos: [], likes_received_count: 0, visitors_count: 0,
}
const RELATIONSHIP = {
    liked_by_me: false, liked_you: false, connected: false,
    blocked_by_me: false, last_connection: null, is_online: false,
}
const NOT_FOUND = { detail: 'Target user not found', code: 'TARGET_USER_NOT_FOUND', field: null }

function renderPage() {
    const Wrapper = authWrapper(makeAuthValue())
    return render(
        <Wrapper>
            <MemoryRouter initialEntries={['/users/5']}>
                <Routes>
                    <Route path="/users/:userId" element={<PublicProfilePage />} />
                </Routes>
            </MemoryRouter>
        </Wrapper>
    )
}

describe('PublicProfilePage report', () => {
    it('does show the error and keep the reason when the report fails', async () => {
        server.use(
            http.get(`${API_BASE_URL}/social/relationship/:id`, () => HttpResponse.json(RELATIONSHIP)),
            http.get(`${API_BASE_URL}/users/:id`, () => HttpResponse.json(PROFILE)),
            http.post(`${API_BASE_URL}/social/visits/:id`, () => HttpResponse.json({ ok: true })),
            http.post(`${API_BASE_URL}/social/reports/:id`, () =>
                HttpResponse.json({ detail: 'Report rejected', code: 'SERVER_ERROR' }, { status: 500 })
            )
        )
        renderPage()

        await screen.findByText(/Bob B/)
        fireEvent.click(screen.getByRole('button', { name: '...' }))
        fireEvent.click(await screen.findByText('Report'))
        const reason = await screen.findByLabelText('Reason')
        fireEvent.change(reason, { target: { value: 'spam account' } })
        fireEvent.click(screen.getByRole('button', { name: 'Send report' }))

        expect(await screen.findByText('Report rejected')).toBeInTheDocument()
        expect(screen.getByLabelText('Reason')).toHaveValue('spam account')
    })
})

describe('PublicProfilePage unavailable', () => {
    it('does show only the unavailable message when the relationship is answered as a missing user', async () => {
        const requests = { profile: 0, visit: 0 }
        server.use(
            http.get(`${API_BASE_URL}/social/relationship/:id`, () => HttpResponse.json(NOT_FOUND, { status: 404 })),
            http.get(`${API_BASE_URL}/users/:id`, () => {
                requests.profile++
                return HttpResponse.json(NOT_FOUND, { status: 404 })
            }),
            http.post(`${API_BASE_URL}/social/visits/:id`, () => {
                requests.visit++
                return HttpResponse.json(NOT_FOUND, { status: 404 })
            }),
        )
        renderPage()

        expect(await screen.findByText(/could not find target account/)).toBeInTheDocument()
        expect(screen.queryByRole('button')).not.toBeInTheDocument()
        expect(requests).toEqual({ profile: 0, visit: 0 })
    })

    it('does hide the cached profile when the target blocks the viewer while the page is open', async () => {
        let blockedByTarget = false
        server.use(
            http.get(`${API_BASE_URL}/social/relationship/:id`, () => blockedByTarget
                ? HttpResponse.json(NOT_FOUND, { status: 404 })
                : HttpResponse.json(RELATIONSHIP)),
            http.get(`${API_BASE_URL}/users/:id`, () => blockedByTarget
                ? HttpResponse.json(NOT_FOUND, { status: 404 })
                : HttpResponse.json(PROFILE)),
            http.post(`${API_BASE_URL}/social/visits/:id`, () => HttpResponse.json({ ok: true })),
        )
        renderPage()
        await screen.findByText(/Bob B/)

        blockedByTarget = true
        act(() => { window.dispatchEvent(new Event('visibilitychange')) })

        expect(await screen.findByText(/could not find target account/)).toBeInTheDocument()
        expect(screen.queryByText(/Bob B/)).not.toBeInTheDocument()
        expect(screen.queryByText(/hello there/)).not.toBeInTheDocument()
        expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })
})

describe('PublicProfilePage blocked by me', () => {
    function serveBlock(initiallyBlocked: boolean) {
        let blockedByMe = initiallyBlocked
        const requests = { visit: 0 }
        server.use(
            http.get(`${API_BASE_URL}/social/relationship/:id`, () =>
                HttpResponse.json({ ...RELATIONSHIP, blocked_by_me: blockedByMe })),
            http.get(`${API_BASE_URL}/users/:id`, () => blockedByMe
                ? HttpResponse.json(NOT_FOUND, { status: 404 })
                : HttpResponse.json(PROFILE)),
            http.post(`${API_BASE_URL}/social/visits/:id`, () => {
                requests.visit++
                return blockedByMe ? HttpResponse.json(NOT_FOUND, { status: 404 }) : HttpResponse.json({ ok: true })
            }),
            http.post(`${API_BASE_URL}/social/blocks/:id`, () => {
                blockedByMe = true
                return HttpResponse.json({ blocked: true })
            }),
            http.delete(`${API_BASE_URL}/social/blocks/:id`, () => {
                blockedByMe = false
                return HttpResponse.json({ blocked: false })
            }),
        )
        return requests
    }

    it('does offer only the unblock action when the viewer blocked the target', async () => {
        const requests = serveBlock(true)
        renderPage()

        expect(await screen.findByText('You blocked this user.')).toBeInTheDocument()
        expect(screen.getAllByRole('button').map(button => button.textContent)).toEqual(['Unblock'])
        expect(screen.queryByText(/could not find target account/)).not.toBeInTheDocument()
        expect(requests.visit).toBe(0)
    })

    it('does show the profile and record the visit when the viewer unblocks the target', async () => {
        const requests = serveBlock(true)
        renderPage()

        fireEvent.click(await screen.findByRole('button', { name: 'Unblock' }))

        expect(await screen.findByText(/Bob B/)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Block him' })).toBeInTheDocument()
        expect(screen.queryByText(/could not find target account/)).not.toBeInTheDocument()
        await waitFor(() => expect(requests.visit).toBe(1))
    })

    it('does replace the profile with the unblock action when the viewer blocks the target', async () => {
        serveBlock(false)
        renderPage()

        fireEvent.click(await screen.findByRole('button', { name: 'Block him' }))

        expect(await screen.findByText('You blocked this user.')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Unblock' })).toBeInTheDocument()
        expect(screen.queryByText(/hello there/)).not.toBeInTheDocument()
        expect(screen.queryByText(/could not find target account/)).not.toBeInTheDocument()
    })
})

describe('PublicProfilePage like', () => {
    function serveRelationship(initial: boolean) {
        let likedByMe = initial
        let relationshipRequests = 0
        server.use(
            http.get(`${API_BASE_URL}/social/relationship/:id`, () => {
                relationshipRequests++
                return HttpResponse.json({ ...RELATIONSHIP, liked_by_me: likedByMe })
            }),
            http.get(`${API_BASE_URL}/users/:id`, () => HttpResponse.json(PROFILE)),
            http.post(`${API_BASE_URL}/social/visits/:id`, () => HttpResponse.json({ ok: true })),
            http.post(`${API_BASE_URL}/social/likes/:id`, () => {
                likedByMe = true
                return HttpResponse.json({ liked: true })
            }),
            http.delete(`${API_BASE_URL}/social/likes/:id`, () => {
                likedByMe = false
                return HttpResponse.json({ liked: false })
            }),
        )
        return () => relationshipRequests
    }

    it('does refetch the relationship when a like is sent', async () => {
        const requests = serveRelationship(false)
        renderPage()

        fireEvent.click(await screen.findByRole('button', { name: 'Like him' }))

        expect(await screen.findByRole('button', { name: 'Liked by me' })).toBeInTheDocument()
        expect(requests()).toBe(2)
    })

    it('does refetch the relationship when a like is removed', async () => {
        const requests = serveRelationship(true)
        renderPage()

        fireEvent.click(await screen.findByRole('button', { name: 'Liked by me' }))

        expect(await screen.findByRole('button', { name: 'Like him' })).toBeInTheDocument()
        expect(requests()).toBe(2)
    })
})
