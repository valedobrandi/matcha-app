import { describe, it, expect, vi, afterEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { server } from './server'
import { authWrapper, makeAuthValue } from './renderWithAuth'
import { API_BASE_URL } from '../api/client'
import { BlockListPage } from '../pages/social/BlockListPage'

class NeverIntersectingObserver {
    observe() {}
    disconnect() {}
}

describe('BlockListPage unblock', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('does drop the user from the list when the unblock succeeds', async () => {
        vi.stubGlobal('IntersectionObserver', NeverIntersectingObserver)
        let blocked = [{ id: 7, first_name: 'Eve', last_name: 'E', blocked_at: '2026-01-01T00:00:00' }]
        server.use(
            http.get(`${API_BASE_URL}/social/blocks`, () => HttpResponse.json(blocked)),
            http.delete(`${API_BASE_URL}/social/blocks/:id`, () => {
                blocked = []
                return HttpResponse.json({ blocked: false })
            }),
        )
        const Wrapper = authWrapper(makeAuthValue())
        render(<Wrapper><BlockListPage /></Wrapper>)

        fireEvent.click(await screen.findByRole('button', { name: 'Unblock' }))

        await waitFor(() => expect(screen.queryByText(/Eve E/)).not.toBeInTheDocument())
    })
})
