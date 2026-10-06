import { afterEach, describe, expect, it, vi } from 'vitest'
import { ws, type WebSocketHandlerConnection } from 'msw'
import { render, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthContext } from '@/auth/AuthContext'
import { RealtimeProvider } from '@/realtime/RealtimeProvider'
import { WS_URL } from '@/api/client'
import { NOTIFICATIONS_KEY, UNREAD_COUNT_KEY } from '@/notifications/queryKeys'
import { server } from './server'
import { makeAuthValue } from './renderWithAuth'

const realtime = ws.link(WS_URL)
const PING = '{"type":"ping","payload":null}'
const PONG = '{"type":"pong","payload":null}'

type RealtimeClient = WebSocketHandlerConnection['client']

function seedNotifications(queryClient: QueryClient) {
    queryClient.setQueryData([UNREAD_COUNT_KEY], { unread_count: 1 })
    queryClient.setQueryData([NOTIFICATIONS_KEY], [])
}

function renderProvider(authValue = makeAuthValue()) {
    const queryClient = new QueryClient()
    seedNotifications(queryClient)
    render(
        <QueryClientProvider client={queryClient}>
            <AuthContext.Provider value={authValue}>
                <RealtimeProvider>page</RealtimeProvider>
            </AuthContext.Provider>
        </QueryClientProvider>,
    )
    return queryClient
}

function isInvalidated(queryClient: QueryClient, key: string) {
    return queryClient.getQueryState([key])?.isInvalidated
}

async function expectNotificationsRefetched(queryClient: QueryClient) {
    await waitFor(() => expect(isInvalidated(queryClient, UNREAD_COUNT_KEY)).toBe(true))
    expect(isInvalidated(queryClient, NOTIFICATIONS_KEY)).toBe(true)
}

afterEach(() => {
    vi.useRealTimers()
})

describe('RealtimeProvider', () => {
    it('does refetch the unread count and the list when a notification arrives', async () => {
        let socketClient: RealtimeClient | undefined
        server.use(realtime.addEventListener('connection', ({ client }) => {
            socketClient = client
        }))

        const queryClient = renderProvider()
        await expectNotificationsRefetched(queryClient)
        seedNotifications(queryClient)
        socketClient!.send(JSON.stringify({ type: 'notification', payload: { id: 7 } }))

        await expectNotificationsRefetched(queryClient)
    })

    it('does refetch the notifications every time the socket opens', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true })
        const clients: RealtimeClient[] = []
        server.use(realtime.addEventListener('connection', ({ client }) => {
            clients.push(client)
        }))

        const queryClient = renderProvider()
        await expectNotificationsRefetched(queryClient)
        seedNotifications(queryClient)
        clients[0].close()

        await vi.advanceTimersByTimeAsync(1000)

        await waitFor(() => expect(clients).toHaveLength(2))
        await expectNotificationsRefetched(queryClient)
    })

    it('does back off up to 5 s when the server drops every connection right after it opens', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true })
        let connections = 0
        server.use(realtime.addEventListener('connection', ({ client }) => {
            connections += 1
            setTimeout(() => client.close())
        }))

        renderProvider()
        await waitFor(() => expect(connections).toBe(1))

        await vi.advanceTimersByTimeAsync(20_000)

        expect(connections).toBe(6)
    })

    it('does reconnect after the first delay when a connection that stayed up drops', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true })
        const clients: RealtimeClient[] = []
        server.use(realtime.addEventListener('connection', ({ client }) => {
            clients.push(client)
            if (clients.length === 1) setTimeout(() => client.close())
        }))

        renderProvider()
        await vi.advanceTimersByTimeAsync(1000)
        await waitFor(() => expect(clients).toHaveLength(2))
        await vi.advanceTimersByTimeAsync(10_000)
        clients[1].close()

        await vi.advanceTimersByTimeAsync(1000)

        await waitFor(() => expect(clients).toHaveLength(3))
    })

    it('does log out and stop reconnecting when the server rejects the token with 1008', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true })
        let connections = 0
        server.use(realtime.addEventListener('connection', ({ client }) => {
            connections += 1
            setTimeout(() => client.close(1008, 'invalid token'))
        }))
        const authValue = makeAuthValue()

        renderProvider(authValue)
        await waitFor(() => expect(authValue.logout).toHaveBeenCalledOnce())

        await vi.advanceTimersByTimeAsync(60_000)

        expect(connections).toBe(1)
    })

    it('does reconnect when the server stops answering pings', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true })
        let connections = 0
        server.use(realtime.addEventListener('connection', () => {
            connections += 1
        }))

        renderProvider()
        await waitFor(() => expect(connections).toBe(1))

        await vi.advanceTimersByTimeAsync(31_000)

        await waitFor(() => expect(connections).toBe(2))
    })

    it('does keep the connection while the server answers pings', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true })
        let connections = 0
        server.use(realtime.addEventListener('connection', ({ client }) => {
            connections += 1
            client.addEventListener('message', event => {
                if (event.data === PING) client.send(PONG)
            })
        }))

        renderProvider()
        await waitFor(() => expect(connections).toBe(1))

        await vi.advanceTimersByTimeAsync(60_000)

        expect(connections).toBe(1)
    })

    it('does check the connection at once when the tab becomes visible', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true })
        let connections = 0
        server.use(realtime.addEventListener('connection', () => {
            connections += 1
        }))

        const queryClient = renderProvider()
        await expectNotificationsRefetched(queryClient)
        document.dispatchEvent(new Event('visibilitychange'))

        await vi.advanceTimersByTimeAsync(6000)

        await waitFor(() => expect(connections).toBe(2))
    })
})
