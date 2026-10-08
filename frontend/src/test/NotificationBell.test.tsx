import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { server } from './server'
import { onAuthenticatedConnection } from './realtimeServer'
import { authWrapper, makeAuthValue } from './renderWithAuth'
import { API_BASE_URL } from '@/api/client'
import { NotificationBell } from '@/components/NotificationBell'
import { RealtimeProvider } from '@/realtime/RealtimeProvider'


function serveUnreadCount(count: () => number) {
    server.use(
        http.get(`${API_BASE_URL}/notifications/unread-count`, () => HttpResponse.json({ unread_count: count() })),
    )
}

function renderBell(children = <NotificationBell />) {
    const Wrapper = authWrapper(makeAuthValue())
    render(
        <Wrapper>
            <MemoryRouter>{children}</MemoryRouter>
        </Wrapper>,
    )
}

describe('NotificationBell', () => {
    it('does show the unread count and link to the notifications page', async () => {
        serveUnreadCount(() => 3)

        renderBell()

        const bell = await screen.findByRole('link', { name: 'Notifications, 3 unread' })
        expect(bell).toHaveAttribute('href', '/notifications')
        expect(bell).toHaveTextContent('3')
    })

    it('does cap the shown count at 99+ and keep the exact count in the label', async () => {
        serveUnreadCount(() => 150)

        renderBell()

        expect(await screen.findByRole('link', { name: 'Notifications, 150 unread' })).toHaveTextContent('99+')
    })

    it('does raise the count when a notification is pushed', async () => {
        let unread = 1
        let socketClient: WebSocketHandlerConnection['client'] | undefined
        serveUnreadCount(() => unread)
        server.use(onAuthenticatedConnection(({ client }) => {
            socketClient = client
        }))

        renderBell(<RealtimeProvider><NotificationBell /></RealtimeProvider>)
        await screen.findByRole('link', { name: 'Notifications, 1 unread' })
        await waitFor(() => expect(socketClient).toBeDefined())
        unread = 2
        socketClient!.send(JSON.stringify({ type: 'notification', payload: { id: 9 } }))

        expect(await screen.findByRole('link', { name: 'Notifications, 2 unread' })).toBeInTheDocument()
    })
})
