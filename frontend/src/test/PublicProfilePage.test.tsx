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
    blocked_by_me: false, blocked_you: false, last_connection: null, is_online: false,
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
