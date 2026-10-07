import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom'
import { server } from './server'
import { authWrapper, makeAuthValue } from './renderWithAuth'
import { API_BASE_URL } from '@/api/client'
import { ChatListPage } from '@/pages/chat/ChatListPage'

class NeverIntersectingObserver {
    observe() {}
    disconnect() {}
}

function ConversationRoute() {
    return <p>Conversation with {useParams().peerId}</p>
}

function renderPage() {
    const Wrapper = authWrapper(makeAuthValue())
    render(
        <Wrapper>
            <MemoryRouter initialEntries={['/chat']}>
                <Routes>
                    <Route path="/chat" element={<ChatListPage />} />
                    <Route path="/chat/:peerId" element={<ConversationRoute />} />
                </Routes>
            </MemoryRouter>
        </Wrapper>,
    )
}

beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', NeverIntersectingObserver)
})

afterEach(() => {
    vi.unstubAllGlobals()
})

describe('ChatListPage', () => {
    it('does list the connections and open the conversation with the one chosen', async () => {
        server.use(http.get(`${API_BASE_URL}/social/connections`, () => HttpResponse.json([
            { id: 5, username: 'bob', first_name: 'Bob', last_name: 'Smith', connected_at: '2026-10-07T09:00:00Z' },
            { id: 6, username: 'cara', first_name: 'Cara', last_name: 'Jones', connected_at: '2026-10-06T09:00:00Z' },
        ])))

        renderPage()
        expect(await screen.findByRole('link', { name: /Cara Jones/ })).toHaveAttribute('href', '/chat/6')
        fireEvent.click(screen.getByRole('link', { name: /Bob Smith/ }))

        expect(await screen.findByText('Conversation with 5')).toBeInTheDocument()
    })

    it('does point to discovery when there are no connections yet', async () => {
        server.use(http.get(`${API_BASE_URL}/social/connections`, () => HttpResponse.json([])))

        renderPage()

        expect(await screen.findByText('No connections yet')).toBeInTheDocument()
        expect(screen.getByRole('link', { name: 'Discover profiles' })).toHaveAttribute('href', '/suggest')
    })
})
