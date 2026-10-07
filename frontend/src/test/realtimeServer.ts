import { ws, type WebSocketHandlerConnection } from 'msw'
import { WS_URL } from '@/api/client'

export type RealtimeClient = WebSocketHandlerConnection['client']

export const READY = '{"type":"ready","payload":null}'

const realtime = ws.link(WS_URL)

export function onAuthenticatedConnection(listener: (connection: WebSocketHandlerConnection) => void) {
    return realtime.addEventListener('connection', connection => {
        connection.client.addEventListener('message', event => {
            if (typeof event.data === 'string' && JSON.parse(event.data).type === 'auth') connection.client.send(READY)
        })
        listener(connection)
    })
}

export function onConnection(listener: (connection: WebSocketHandlerConnection) => void) {
    return realtime.addEventListener('connection', listener)
}
