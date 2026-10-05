import { describe, it, expect } from 'vitest'
import { http, HttpResponse } from 'msw'
import { fireEvent, render, screen } from '@testing-library/react'
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
        server.use(
            http.get(`${API_BASE_URL}/social/relationship/:id`, () =>
                HttpResponse.json({ detail: 'Target user not found', code: 'TARGET_USER_NOT_FOUND', field: null }, { status: 404 })
            ),
        )
        renderPage()

        expect(await screen.findByText(/could not find target account/)).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /Block|Unblock|Like/ })).not.toBeInTheDocument()
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
