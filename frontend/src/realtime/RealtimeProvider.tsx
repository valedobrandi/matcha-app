import { useEffect, type ReactNode } from "react"
import { useQueryClient, type QueryClient } from "@tanstack/react-query"
import { useAuth } from "@/auth/useAuth"
import { WS_URL } from "@/api/client"
import { NOTIFICATIONS_KEY, UNREAD_COUNT_KEY } from "@/notifications/queryKeys"
import type { components } from "@/types/api"

type UnreadCountOut = components["schemas"]["UnreadCountOut"]

// The server closes with 1008 when the token is invalid: reconnecting cannot help.
const INVALID_TOKEN_CLOSE_CODE = 1008
const FIRST_RECONNECT_DELAY_MS = 1000
const MAX_RECONNECT_DELAY_MS = 30_000

function reconnectDelay(attempt: number): number {
    return Math.min(FIRST_RECONNECT_DELAY_MS * 2 ** attempt, MAX_RECONNECT_DELAY_MS)
}

function onNotification(queryClient: QueryClient) {
    queryClient.setQueriesData<UnreadCountOut>(
        { queryKey: [UNREAD_COUNT_KEY] },
        old => old && { unread_count: old.unread_count + 1 },
    )
    queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_KEY] })
}

// Events missed while the socket was down are only in the database.
function refetchNotifications(queryClient: QueryClient) {
    queryClient.invalidateQueries({ queryKey: [UNREAD_COUNT_KEY] })
    queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_KEY] })
}

// One socket per tab (ADR-0011). Socket events only update the query cache; screens keep
// reading server state through their hooks.
export function RealtimeProvider({ children }: { children: ReactNode }) {
    const { accessToken } = useAuth()
    const queryClient = useQueryClient()

    useEffect(() => {
        if (!accessToken) return
        let socket: WebSocket
        let attempt = 0
        let retryTimer: ReturnType<typeof setTimeout> | undefined
        let stopped = false

        const connect = () => {
            socket = new WebSocket(`${WS_URL}?token=${encodeURIComponent(accessToken)}`)
            socket.onopen = () => {
                if (attempt > 0) refetchNotifications(queryClient)
                attempt = 0
            }
            socket.onmessage = message => {
                const event = JSON.parse(message.data) as { type: string }
                if (event.type === "notification") onNotification(queryClient)
            }
            socket.onclose = event => {
                if (stopped || event.code === INVALID_TOKEN_CLOSE_CODE) return
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
    }, [accessToken, queryClient])

    return children
}
