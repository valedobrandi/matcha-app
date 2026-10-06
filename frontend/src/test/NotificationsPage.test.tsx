import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom'
import { server } from './server'
import { authWrapper, makeAuthValue } from './renderWithAuth'
import { API_BASE_URL } from '@/api/client'
import { NotificationBell } from '@/components/NotificationBell'
import { NotificationsPage } from '@/pages/notifications/NotificationsPage'

const BOB = { id: 5, username: 'bob', first_name: 'Bob', last_name: 'Smith' }

function notification(id: number, type: string, readAt: string | null = null) {
    return { id, type, actor: BOB, entity_id: null, read_at: readAt, created_at: '2026-10-06T09:30:00' }
}

class NeverIntersectingObserver {
    observe() {}
    disconnect() {}
}

function UserPage() {
    return <p>Profile {useParams().userId}</p>
}

function renderPage() {
    const Wrapper = authWrapper(makeAuthValue())
    render(
        <Wrapper>
            <MemoryRouter initialEntries={['/notifications']}>
                <NotificationBell />
                <Routes>
                    <Route path="/notifications" element={<NotificationsPage />} />
                    <Route path="/users/:userId" element={<UserPage />} />
                </Routes>
            </MemoryRouter>
        </Wrapper>,
    )
}

function serveNotifications(list: () => unknown[], unreadCount: () => number) {
    server.use(
        http.get(`${API_BASE_URL}/notifications`, () => HttpResponse.json(list())),
        http.get(`${API_BASE_URL}/notifications/unread-count`, () => HttpResponse.json({ unread_count: unreadCount() })),
    )
}

beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', NeverIntersectingObserver)
})

afterEach(() => {
    vi.unstubAllGlobals()
})

describe('NotificationsPage', () => {
    it('does describe each notification by its actor and mark the unread ones as new', async () => {
        serveNotifications(() => [
            notification(1, 'liked'),
            notification(2, 'visited'),
            notification(3, 'matched', '2026-10-06T10:00:00'),
            notification(4, 'unliked', '2026-10-06T10:00:00'),
            notification(5, 'message', '2026-10-06T10:00:00'),
        ], () => 2)

        renderPage()

        expect(await screen.findByText('Bob Smith liked you')).toBeInTheDocument()
        expect(screen.getByText('Bob Smith viewed your profile')).toBeInTheDocument()
        expect(screen.getByText('You and Bob Smith are now connected')).toBeInTheDocument()
        expect(screen.getByText('Bob Smith unliked you')).toBeInTheDocument()
        expect(screen.getByText('Bob Smith sent you a message')).toBeInTheDocument()
        expect(screen.getAllByText('New')).toHaveLength(2)
    })

    it('does mark an unread notification read and open the actor profile when it is clicked', async () => {
        const markedRead: string[] = []
        serveNotifications(() => [notification(7, 'liked')], () => 1)
        server.use(http.post(`${API_BASE_URL}/notifications/:id/read`, ({ params }) => {
            markedRead.push(String(params.id))
            return HttpResponse.json({ ok: true })
        }))

        renderPage()
        fireEvent.click(await screen.findByRole('link', { name: /Bob Smith liked you/ }))

        expect(await screen.findByText('Profile 5')).toBeInTheDocument()
        await waitFor(() => expect(markedRead).toEqual(['7']))
    })

    it('does mark all as read and clear the bell count', async () => {
        let unread = 2
        serveNotifications(
            () => [notification(1, 'liked', unread ? null : 'now'), notification(2, 'visited', unread ? null : 'now')],
            () => unread,
        )
        server.use(http.post(`${API_BASE_URL}/notifications/read-all`, () => {
            unread = 0
            return HttpResponse.json({ ok: true })
        }))

        renderPage()
        await screen.findByRole('link', { name: 'Notifications, 2 unread' })
        fireEvent.click(screen.getByRole('button', { name: 'Mark all as read' }))

        await waitFor(() => expect(screen.getByRole('button', { name: 'Mark all as read' })).toBeDisabled())
        await waitFor(() => expect(screen.queryByText('New')).not.toBeInTheDocument())
        expect(screen.getByRole('link', { name: 'Notifications' }).textContent).toBe('')
    })

    it('does point to discovery when there are no notifications yet', async () => {
        serveNotifications(() => [], () => 0)

        renderPage()

        expect(await screen.findByText('No notifications yet')).toBeInTheDocument()
        expect(screen.getByRole('link', { name: 'Discover profiles' })).toHaveAttribute('href', '/suggest')
        expect(screen.getByRole('button', { name: 'Mark all as read' })).toBeDisabled()
    })

    it('does show the server message when the notifications cannot be loaded', async () => {
        server.use(
            http.get(`${API_BASE_URL}/notifications`, () =>
                HttpResponse.json({ detail: 'Notifications are unavailable', code: 'SERVER_ERROR' }, { status: 500 })),
            http.get(`${API_BASE_URL}/notifications/unread-count`, () => HttpResponse.json({ unread_count: 0 })),
        )

        renderPage()

        expect(await screen.findByText('Notifications are unavailable')).toBeInTheDocument()
        expect(screen.queryByText('No notifications yet')).not.toBeInTheDocument()
    })
})
