import { afterEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse, ws, type WebSocketHandlerConnection } from 'msw'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { server } from './server'
import { authWrapper, makeAuthValue } from './renderWithAuth'
import { API_BASE_URL, WS_URL } from '@/api/client'
import { ConversationPage } from '@/pages/chat/ConversationPage'
import { RealtimeProvider } from '@/realtime/RealtimeProvider'

const ME = 1
const BOB = { id: 5, username: 'bob', first_name: 'Bob', last_name: 'Smith' }
const realtime = ws.link(WS_URL)

type RealtimeClient = WebSocketHandlerConnection['client']

function chatMessage(id: number, fromUserId: number, body = `Message ${id}`, createdAt = '2026-10-07T09:30:00Z') {
    return {
        id,
        from_user_id: fromUserId,
        to_user_id: fromUserId === BOB.id ? ME : BOB.id,
        body,
        created_at: createdAt,
    }
}

class EverythingInViewObserver {
    callback: IntersectionObserverCallback
    constructor(callback: IntersectionObserverCallback) { this.callback = callback }
    observe(target: Element) {
        this.callback(
            [{ target, isIntersecting: true } as unknown as IntersectionObserverEntry],
            this as unknown as IntersectionObserver,
        )
    }
    unobserve() {}
    disconnect() {}
}

function serveConversation(history: (before: string | null) => unknown[]) {
    const requestedBefore: Array<string | null> = []
    const readUpTo: number[] = []
    server.use(
        http.get(`${API_BASE_URL}/chat/messages/:peerId`, ({ request }) => {
            const before = new URL(request.url).searchParams.get('before')
            requestedBefore.push(before)
            return HttpResponse.json(history(before))
        }),
        http.post(`${API_BASE_URL}/chat/conversations/:peerId/read`, async ({ request }) => {
            const payload = await request.json() as { up_to_message_id: number }
            readUpTo.push(payload.up_to_message_id)
            return HttpResponse.json({ ok: true })
        }),
        http.get(`${API_BASE_URL}/social/relationship/:id`, () => HttpResponse.json({
            liked_by_me: true, liked_you: true, connected: true, blocked_by_me: false,
            last_connection: '2026-10-07T09:00:00Z', is_online: true,
        })),
        http.get(`${API_BASE_URL}/users/:id`, () => HttpResponse.json({
            ...BOB, gender: 'male', sexual_preference: 'female', age: 30, bio: 'hi', fame_rating: 10,
            location_label: 'Paris', last_connection: '2026-10-07T09:00:00Z', is_online: true,
            tags: [], photos: [], likes_received_count: 1, visitors_count: 1,
        })),
        http.get(`${API_BASE_URL}/notifications/unread-count`, () =>
            HttpResponse.json({ unread_count: 0, unread_messages: 0 })),
    )
    return { requestedBefore, readUpTo }
}

function connectSocket() {
    const sockets: RealtimeClient[] = []
    server.use(realtime.addEventListener('connection', ({ client }) => {
        sockets.push(client)
    }))
    return sockets
}

function renderConversation() {
    const Wrapper = authWrapper(makeAuthValue())
    render(
        <Wrapper>
            <RealtimeProvider>
                <MemoryRouter initialEntries={[`/chat/${BOB.id}`]}>
                    <Routes>
                        <Route path="/chat/:peerId" element={<ConversationPage />} />
                    </Routes>
                </MemoryRouter>
            </RealtimeProvider>
        </Wrapper>,
    )
}

function findMessageBox() {
    return screen.findByRole('textbox', { name: 'Message Bob Smith' })
}

afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
})

describe('ConversationPage', () => {
    it('does show the history in time order with each side marked for screen readers', async () => {
        vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-10-07T09:31:00Z') })
        serveConversation(() => [chatMessage(3, ME), chatMessage(2, BOB.id), chatMessage(1, BOB.id)])
        connectSocket()

        renderConversation()

        const log = await screen.findByRole('log')
        await waitFor(() => expect(log).toHaveTextContent(/Received.*Message 1.*Received.*Message 2.*Sent.*Message 3/))
        expect(screen.getByRole('heading', { name: 'Bob Smith' })).toBeInTheDocument()
        expect(screen.getByText('Today')).toBeInTheDocument()
    })

    it('does label each day where it starts once the whole history is shown', async () => {
        vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-10-07T12:30:00Z') })
        serveConversation(() => [
            chatMessage(3, ME, 'Fine, thanks', '2026-10-07T12:29:00Z'),
            chatMessage(2, BOB.id, 'How are you?', '2026-10-06T12:28:00Z'),
            chatMessage(1, BOB.id, 'Hi', '2026-10-06T12:27:00Z'),
        ])
        connectSocket()

        renderConversation()

        const log = await screen.findByRole('log')
        await waitFor(() => expect(log).toHaveTextContent(/^Yesterday.*Hi.*How are you\?.*Today.*Fine, thanks/))
    })

    it('does leave the top unlabelled while older messages remain to load', async () => {
        const page = Array.from({ length: 50 }, (_, index) => chatMessage(100 - index, BOB.id))
        serveConversation(before => before === null ? page : [])
        connectSocket()

        renderConversation()

        const log = await screen.findByRole('log')
        await waitFor(() => expect(log).toHaveTextContent(/^Received\s*Message 51/))
    })

    it('does send the typed message on Enter, show it once and empty the box', async () => {
        serveConversation(() => [chatMessage(1, BOB.id)])
        const sockets = connectSocket()
        const sentBodies: unknown[] = []
        server.use(http.post(`${API_BASE_URL}/chat/messages/:peerId`, async ({ request }) => {
            sentBodies.push(await request.json())
            const sent = chatMessage(2, ME, 'Hello Bob')
            sockets[0].send(JSON.stringify({ type: 'chat.message', payload: sent }))
            return HttpResponse.json(sent)
        }))

        renderConversation()
        const messageBox = await findMessageBox()
        await waitFor(() => expect(sockets).toHaveLength(1))
        fireEvent.change(messageBox, { target: { value: '  Hello Bob  ' } })
        fireEvent.keyDown(messageBox, { key: 'Enter' })

        expect(await screen.findByText('Hello Bob')).toBeInTheDocument()
        await waitFor(() => expect(messageBox).toHaveValue(''))
        expect(sentBodies).toEqual([{ body: 'Hello Bob' }])
        expect(screen.getAllByText('Hello Bob')).toHaveLength(1)
    })

    it('does keep a new line on Shift+Enter instead of sending', async () => {
        serveConversation(() => [chatMessage(1, BOB.id)])
        connectSocket()
        const sent = vi.fn()
        server.use(http.post(`${API_BASE_URL}/chat/messages/:peerId`, () => {
            sent()
            return HttpResponse.json(chatMessage(2, ME))
        }))

        renderConversation()
        const messageBox = await findMessageBox()
        fireEvent.change(messageBox, { target: { value: 'Hello' } })
        fireEvent.keyDown(messageBox, { key: 'Enter', shiftKey: true })

        expect(messageBox).toHaveValue('Hello')
        expect(sent).not.toHaveBeenCalled()
    })

    it('does show a message the peer sends while the conversation is open', async () => {
        serveConversation(() => [chatMessage(1, BOB.id)])
        const sockets = connectSocket()

        renderConversation()
        await screen.findByText('Message 1')
        await waitFor(() => expect(sockets).toHaveLength(1))
        sockets[0].send(JSON.stringify({ type: 'chat.message', payload: chatMessage(2, BOB.id, 'Are you there?') }))

        expect(await screen.findByText('Are you there?')).toBeInTheDocument()
    })

    it('does mark the conversation read up to the newest message from the peer that the screen shows', async () => {
        vi.stubGlobal('IntersectionObserver', EverythingInViewObserver)
        const { readUpTo } = serveConversation(() => [chatMessage(3, ME), chatMessage(2, BOB.id), chatMessage(1, BOB.id)])
        const sockets = connectSocket()

        renderConversation()
        await waitFor(() => expect(readUpTo).toEqual([2]))
        await waitFor(() => expect(sockets).toHaveLength(1))
        sockets[0].send(JSON.stringify({ type: 'chat.message', payload: chatMessage(4, BOB.id) }))

        await waitFor(() => expect(readUpTo).toEqual([2, 4]))
    })

    it('does leave the messages unread while the screen shows none of them', async () => {
        const { readUpTo } = serveConversation(() => [chatMessage(2, BOB.id), chatMessage(1, BOB.id)])
        connectSocket()

        renderConversation()
        await screen.findByText('Message 2')
        await new Promise(resolve => setTimeout(resolve, 50))

        expect(readUpTo).toEqual([])
    })

    it('does load older messages once the oldest shown message comes into view', async () => {
        vi.stubGlobal('IntersectionObserver', EverythingInViewObserver)
        const page = (newestId: number, count: number) =>
            Array.from({ length: count }, (_, index) => chatMessage(newestId - index, BOB.id))
        const { requestedBefore } = serveConversation(before => before === null ? page(100, 50) : page(50, 10))
        connectSocket()

        renderConversation()

        expect(await screen.findByText('Message 41')).toBeInTheDocument()
        expect(requestedBefore).toEqual([null, '51'])
    })

    it('does keep the typed text and explain the failure when the message cannot be sent', async () => {
        serveConversation(() => [chatMessage(1, BOB.id)])
        connectSocket()
        server.use(http.post(`${API_BASE_URL}/chat/messages/:peerId`, () => HttpResponse.error()))

        renderConversation()
        const messageBox = await findMessageBox()
        fireEvent.change(messageBox, { target: { value: 'Hello Bob' } })
        fireEvent.click(screen.getByRole('button', { name: 'Send message' }))

        expect(await screen.findByText('Could not send the message, please try again')).toBeInTheDocument()
        expect(messageBox).toHaveValue('Hello Bob')
    })

    it('does invite the user to say hello when there are no messages yet', async () => {
        serveConversation(() => [])
        connectSocket()

        renderConversation()

        expect(await screen.findByText('No messages yet')).toBeInTheDocument()
        expect(await screen.findByText('Say hello to Bob.')).toBeInTheDocument()
        expect(await findMessageBox()).toBeEnabled()
    })

    it('does explain why the conversation cannot be opened and offer no message box', async () => {
        serveConversation(() => [])
        connectSocket()
        server.use(http.get(`${API_BASE_URL}/chat/messages/:peerId`, () => HttpResponse.json(
            { detail: 'Users must be connected to chat', code: 'CHAT_NOT_CONNECTED' },
            { status: 403 },
        )))

        renderConversation()

        expect(await screen.findByText('You can chat only with people you are connected with.')).toBeInTheDocument()
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    })
})
