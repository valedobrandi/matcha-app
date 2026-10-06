import { useEffect, type ReactNode } from "react"
import { useQueryClient, type QueryClient } from "@tanstack/react-query"
import { useAuth } from "@/auth/useAuth"
import { WS_URL } from "@/api/client"
import { NOTIFICATIONS_KEY, UNREAD_COUNT_KEY } from "@/notifications/queryKeys"

// The server closes with 1008 when the token is invalid: reconnecting cannot help.
const INVALID_TOKEN_CLOSE_CODE = 1008
const FIRST_RECONNECT_DELAY_MS = 1000
const MAX_RECONNECT_DELAY_MS = 5000
const STABLE_CONNECTION_MS = 10_000

function reconnectDelay(attempt: number): number {
    return Math.min(FIRST_RECONNECT_DELAY_MS * 2 ** attempt, MAX_RECONNECT_DELAY_MS)
}

// Events missed while the socket was down are only in the database.
function refetchNotifications(queryClient: QueryClient) {
    queryClient.invalidateQueries({ queryKey: [UNREAD_COUNT_KEY] })
    queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_KEY] })
}

// One socket per tab (ADR-0011). Socket events only update the query cache; screens keep
// reading server state through their hooks.
export function RealtimeProvider({ children }: { children: ReactNode }) {
    const { accessToken, logout } = useAuth()
    const queryClient = useQueryClient()

    useEffect(() => {
        if (!accessToken) return
        let socket: WebSocket
        let attempt = 0
        let retryTimer: ReturnType<typeof setTimeout> | undefined
        let stopped = false

        const connect = () => {
            let openedAt: number | undefined
            socket = new WebSocket(`${WS_URL}?token=${encodeURIComponent(accessToken)}`)
            socket.onopen = () => {
                openedAt = Date.now()
                refetchNotifications(queryClient)
            }
            socket.onmessage = message => {
                const event = JSON.parse(message.data) as { type: string }
                if (event.type === "notification") refetchNotifications(queryClient)
            }
            socket.onclose = event => {
                if (stopped) return
                if (event.code === INVALID_TOKEN_CLOSE_CODE) {
                    logout()
                    return
                }
                if (openedAt !== undefined && Date.now() - openedAt >= STABLE_CONNECTION_MS) attempt = 0
                retryTimer = setTimeout(connect, reconnectDelay(attempt))
                attempt += 1
            }
        }
        connect()

        return () => {
            stopped = true
            clearTimeout(retryTimer)
            // Closing a socket that is still connecting makes the browser log a warning.
            if (socket.readyState === WebSocket.CONNECTING) socket.onopen = () => socket.close()
            else socket.close()
        }
    }, [accessToken, logout, queryClient])

    return children
}
