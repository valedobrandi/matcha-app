import { afterEach, describe, expect, it, vi } from 'vitest'
import { ws } from 'msw'
import { render, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthContext } from '@/auth/AuthContext'
import { RealtimeProvider } from '@/realtime/RealtimeProvider'
import { WS_URL } from '@/api/client'
import { NOTIFICATIONS_KEY, UNREAD_COUNT_KEY } from '@/notifications/queryKeys'
import { server } from './server'
import { makeAuthValue } from './renderWithAuth'

const realtime = ws.link(WS_URL)

function renderProvider() {
    const queryClient = new QueryClient()
    queryClient.setQueryData([UNREAD_COUNT_KEY], { unread_count: 1 })
    queryClient.setQueryData([NOTIFICATIONS_KEY], [])
    render(
        <QueryClientProvider client={queryClient}>
            <AuthContext.Provider value={makeAuthValue()}>
                <RealtimeProvider>page</RealtimeProvider>
            </AuthContext.Provider>
        </QueryClientProvider>,
    )
    return queryClient
}

function isInvalidated(queryClient: QueryClient, key: string) {
    return queryClient.getQueryState([key])?.isInvalidated
}

afterEach(() => {
    vi.useRealTimers()
})

describe('RealtimeProvider', () => {
    it('does raise the unread count and refresh the list when a notification arrives', async () => {
        server.use(realtime.addEventListener('connection', ({ client }) => {
            client.send(JSON.stringify({ type: 'notification', payload: { id: 7 } }))
        }))

        const queryClient = renderProvider()

        await waitFor(() => expect(queryClient.getQueryData([UNREAD_COUNT_KEY])).toEqual({ unread_count: 2 }))
        expect(isInvalidated(queryClient, NOTIFICATIONS_KEY)).toBe(true)
    })

    it('does refetch the notifications when the socket reconnects', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true })
        let connections = 0
        server.use(realtime.addEventListener('connection', ({ client }) => {
            connections += 1
            if (connections === 1) client.close()
        }))

        const queryClient = renderProvider()
        await waitFor(() => expect(connections).toBe(1))
        expect(isInvalidated(queryClient, UNREAD_COUNT_KEY)).toBe(false)

        await vi.advanceTimersByTimeAsync(1000)

        await waitFor(() => expect(connections).toBe(2))
        await waitFor(() => expect(isInvalidated(queryClient, UNREAD_COUNT_KEY)).toBe(true))
        expect(isInvalidated(queryClient, NOTIFICATIONS_KEY)).toBe(true)
    })

    it('does stop reconnecting when the server rejects the token with 1008', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true })
        let connections = 0
        server.use(realtime.addEventListener('connection', ({ client }) => {
            connections += 1
            client.close(1008, 'invalid token')
        }))

        renderProvider()
        await waitFor(() => expect(connections).toBe(1))

        await vi.advanceTimersByTimeAsync(60_000)

        expect(connections).toBe(1)
    })
})
