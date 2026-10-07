import { afterEach, describe, expect, it, vi } from 'vitest'
import { ws, type WebSocketHandlerConnection } from 'msw'
import { render, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider, type InfiniteData } from '@tanstack/react-query'
import { AuthContext } from '@/auth/AuthContext'
import { RealtimeProvider } from '@/realtime/RealtimeProvider'
import { WS_URL } from '@/api/client'
import { CONNECTIONS_KEY, CONVERSATION_KEY } from '@/chat/queryKeys'
import { NOTIFICATIONS_KEY, UNREAD_COUNT_KEY } from '@/notifications/queryKeys'
import type { MessageOut } from '@/types/chat'
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

const BOB_ID = 5
const MY_ID = 1

function chatMessage(id: number, fromUserId: number): MessageOut {
    return {
        id,
        from_user_id: fromUserId,
        to_user_id: fromUserId === BOB_ID ? MY_ID : BOB_ID,
        body: `Message ${id}`,
        created_at: '2026-10-07T09:30:00Z',
    }
}

function seedChat(queryClient: QueryClient) {
    queryClient.setQueryData([CONNECTIONS_KEY], [])
    queryClient.setQueryData([CONVERSATION_KEY, BOB_ID], { pages: [[chatMessage(2, BOB_ID)]], pageParams: [undefined] })
}

function conversationIds(queryClient: QueryClient) {
    return queryClient.getQueryData<InfiniteData<MessageOut[]>>([CONVERSATION_KEY, BOB_ID])
        ?.pages.flat().map(message => message.id)
}

afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
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

    it('does refetch the unread count and the list when notifications are read in another tab', async () => {
        let socketClient: RealtimeClient | undefined
        server.use(realtime.addEventListener('connection', ({ client }) => {
            socketClient = client
        }))

        const queryClient = renderProvider()
        await expectNotificationsRefetched(queryClient)
        seedNotifications(queryClient)
        socketClient!.send(JSON.stringify({ type: 'notifications.read', payload: null }))

        await expectNotificationsRefetched(queryClient)
    })

    it('does refetch the views that hide blocked users when a block changes in another tab', async () => {
        let socketClient: RealtimeClient | undefined
        server.use(realtime.addEventListener('connection', ({ client }) => {
            socketClient = client
        }))

        const queryClient = renderProvider()
        await expectNotificationsRefetched(queryClient)
        seedNotifications(queryClient)
        queryClient.setQueryData(['visitors'], [])
        socketClient!.send(JSON.stringify({ type: 'blocks.changed', payload: null }))

        await waitFor(() => expect(isInvalidated(queryClient, 'visitors')).toBe(true))
        await expectNotificationsRefetched(queryClient)
    })

    it('does refetch every query on screen every time the socket opens, as events may have been missed', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true })
        const clients: RealtimeClient[] = []
        server.use(realtime.addEventListener('connection', ({ client }) => {
            clients.push(client)
        }))
        const seedEverySocketFedView = (queryClient: QueryClient) => {
            seedNotifications(queryClient)
            seedChat(queryClient)
            queryClient.setQueryData(['visitors'], [])
            queryClient.setQueryData(['public-profile', BOB_ID], {})
        }
        const expectEverySocketFedViewRefetched = async (queryClient: QueryClient) => {
            await expectNotificationsRefetched(queryClient)
            for (const key of [CONNECTIONS_KEY, 'visitors'])
                expect(isInvalidated(queryClient, key)).toBe(true)
            for (const key of [[CONVERSATION_KEY, BOB_ID], ['public-profile', BOB_ID]])
                expect(queryClient.getQueryState(key)?.isInvalidated).toBe(true)
        }

        const queryClient = renderProvider()
        seedEverySocketFedView(queryClient)
        await expectEverySocketFedViewRefetched(queryClient)
        seedEverySocketFedView(queryClient)
        clients[0].close()

        await vi.advanceTimersByTimeAsync(1000)

        await waitFor(() => expect(clients).toHaveLength(2))
        await expectEverySocketFedViewRefetched(queryClient)
    })

    it('does add a pushed chat message to its conversation once, whichever side sent it', async () => {
        let socketClient: RealtimeClient | undefined
        server.use(realtime.addEventListener('connection', ({ client }) => {
            socketClient = client
        }))

        const queryClient = renderProvider()
        await expectNotificationsRefetched(queryClient)
        seedChat(queryClient)
        for (const message of [chatMessage(3, MY_ID), chatMessage(4, BOB_ID), chatMessage(4, BOB_ID), chatMessage(5, BOB_ID)])
            socketClient!.send(JSON.stringify({ type: 'chat.message', payload: message }))

        await waitFor(() => expect(conversationIds(queryClient)).toEqual([5, 4, 3, 2]))
    })

    it('does refetch the views that show likes when the likes change in another tab', async () => {
        let socketClient: RealtimeClient | undefined
        server.use(realtime.addEventListener('connection', ({ client }) => {
            socketClient = client
        }))

        const queryClient = renderProvider()
        await expectNotificationsRefetched(queryClient)
        seedChat(queryClient)
        queryClient.setQueryData(['relationship'], {})
        socketClient!.send(JSON.stringify({ type: 'likes.changed', payload: null }))

        await waitFor(() => expect(isInvalidated(queryClient, 'relationship')).toBe(true))
        expect(isInvalidated(queryClient, CONNECTIONS_KEY)).toBe(true)
        expect(queryClient.getQueryState([CONVERSATION_KEY, BOB_ID])?.isInvalidated).toBe(true)
    })

    it('does refetch the chat list when a match or an unlike is notified, but not on a visit', async () => {
        let socketClient: RealtimeClient | undefined
        server.use(realtime.addEventListener('connection', ({ client }) => {
            socketClient = client
        }))

        const queryClient = renderProvider()
        await expectNotificationsRefetched(queryClient)
        seedNotifications(queryClient)
        seedChat(queryClient)
        socketClient!.send(JSON.stringify({ type: 'notification', payload: { id: 8, type: 'visited' } }))
        await expectNotificationsRefetched(queryClient)
        expect(isInvalidated(queryClient, CONNECTIONS_KEY)).toBe(false)

        for (const type of ['matched', 'unliked']) {
            seedChat(queryClient)
            socketClient!.send(JSON.stringify({ type: 'notification', payload: { id: 9, type } }))
            await waitFor(() => expect(isInvalidated(queryClient, CONNECTIONS_KEY)).toBe(true))
        }
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
            client.addEventListener('message', event => {
                if (event.data === PING) client.send(PONG)
            })
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

    it('does replace a socket that stops answering pings within 9 s without waiting for it to close', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true })
        let created = 0
        vi.stubGlobal('WebSocket', new Proxy(globalThis.WebSocket, {
            construct(target, args: ConstructorParameters<typeof WebSocket>) {
                const socket = new target(...args)
                created += 1
                if (created === 1) vi.spyOn(socket, 'close').mockImplementation(() => {})
                return socket
            },
        }))
        let connections = 0
        server.use(realtime.addEventListener('connection', () => {
            connections += 1
        }))

        renderProvider()
        await waitFor(() => expect(connections).toBe(1))
        await vi.advanceTimersByTimeAsync(8000)
        expect(connections).toBe(1)

        await vi.advanceTimersByTimeAsync(1000)

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

        await vi.advanceTimersByTimeAsync(4000)

        await waitFor(() => expect(connections).toBe(2))
    })

    it('does check the connection at once when the browser comes back online', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true })
        let connections = 0
        server.use(realtime.addEventListener('connection', () => {
            connections += 1
        }))

        const queryClient = renderProvider()
        await expectNotificationsRefetched(queryClient)
        window.dispatchEvent(new Event('online'))

        await vi.advanceTimersByTimeAsync(4000)

        await waitFor(() => expect(connections).toBe(2))
    })
})
