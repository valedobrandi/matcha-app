import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { server } from './server'
import { authWrapper, makeAuthValue } from './renderWithAuth'
import { API_BASE_URL } from '@/api/client'
import { NotificationBell } from '@/components/NotificationBell'
import { AppSidebar } from '@/components/ui/app-sidebar'
import { SidebarProvider } from '@/components/ui/sidebar'

const originalMatchMedia = window.matchMedia

function serveUnreadCount(unreadCount: number, unreadMessages: number) {
    server.use(http.get(`${API_BASE_URL}/notifications/unread-count`, () =>
        HttpResponse.json({ unread_count: unreadCount, unread_messages: unreadMessages })))
}

function renderSidebar(path = '/suggest') {
    const Wrapper = authWrapper(makeAuthValue())
    render(
        <Wrapper>
            <MemoryRouter initialEntries={[path]}>
                <SidebarProvider>
                    <AppSidebar />
                    <NotificationBell />
                </SidebarProvider>
            </MemoryRouter>
        </Wrapper>,
    )
}

beforeEach(() => {
    window.matchMedia = ((query: string) => ({
        matches: false,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia
})

afterEach(() => {
    window.matchMedia = originalMatchMedia
})

describe('AppSidebar', () => {
    it('does mark the Chat item while messages are unread', async () => {
        serveUnreadCount(3, 1)

        renderSidebar()

        expect(await screen.findByRole('link', { name: 'Chat, new messages' })).toHaveAttribute('href', '/chat')
    })

    it('does leave the Chat item unmarked when only other notifications are unread', async () => {
        serveUnreadCount(3, 0)

        renderSidebar()

        await screen.findByRole('link', { name: 'Notifications, 3 unread' })
        expect(screen.getByRole('link', { name: 'Chat' })).toBeInTheDocument()
    })

    it('does show the Chat item as the current page inside a conversation', async () => {
        serveUnreadCount(0, 0)

        renderSidebar('/chat/5')

        expect(await screen.findByRole('link', { name: 'Chat' })).toHaveAttribute('data-active')
    })
})
