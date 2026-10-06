import { useEffect, type ReactNode } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/auth/useAuth"
import { WS_URL } from "@/api/client"
import { invalidateNotifications } from "@/notifications/queryKeys"

// The server closes with 1008 when the token is invalid: reconnecting cannot help.
const INVALID_TOKEN_CLOSE_CODE = 1008
const FIRST_RECONNECT_DELAY_MS = 1000
const MAX_RECONNECT_DELAY_MS = 5000
const STABLE_CONNECTION_MS = 10_000
const PING = JSON.stringify({ type: "ping", payload: null })
const PING_INTERVAL_MS = 5000
const PONG_TIMEOUT_MS = 3000

function reconnectDelay(attempt: number): number {
    return Math.min(FIRST_RECONNECT_DELAY_MS * 2 ** attempt, MAX_RECONNECT_DELAY_MS)
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
        let openedAt: number | undefined
        let retryTimer: ReturnType<typeof setTimeout> | undefined
        let pingTimer: ReturnType<typeof setInterval> | undefined
        let pongTimer: ReturnType<typeof setTimeout> | undefined
        let stopped = false

        const stopPinging = () => {
            clearInterval(pingTimer)
            clearTimeout(pongTimer)
            pongTimer = undefined
        }

        const scheduleReconnect = () => {
            if (openedAt !== undefined && Date.now() - openedAt >= STABLE_CONNECTION_MS) attempt = 0
            retryTimer = setTimeout(connect, reconnectDelay(attempt))
            attempt += 1
        }

        const abandonSocket = () => {
            stopPinging()
            socket.onmessage = null
            socket.onclose = null
            socket.close()
            scheduleReconnect()
        }

        const ping = () => {
            if (socket.readyState !== WebSocket.OPEN || pongTimer !== undefined) return
            socket.send(PING)
            pongTimer = setTimeout(abandonSocket, PONG_TIMEOUT_MS)
        }

        const pingWhenVisible = () => {
            if (document.visibilityState === "visible") ping()
        }

        const connect = () => {
            openedAt = undefined
            socket = new WebSocket(`${WS_URL}?token=${encodeURIComponent(accessToken)}`)
            socket.onopen = () => {
                openedAt = Date.now()
                pingTimer = setInterval(ping, PING_INTERVAL_MS)
                invalidateNotifications(queryClient)
            }
            socket.onmessage = message => {
                clearTimeout(pongTimer)
                pongTimer = undefined
                const event = JSON.parse(message.data) as { type: string }
                if (event.type === "notification") invalidateNotifications(queryClient)
            }
            socket.onclose = event => {
                stopPinging()
                if (stopped) return
                if (event.code === INVALID_TOKEN_CLOSE_CODE) {
                    logout()
                    return
                }
                scheduleReconnect()
            }
        }
        connect()
        document.addEventListener("visibilitychange", pingWhenVisible)
        window.addEventListener("online", ping)

        return () => {
            stopped = true
            clearTimeout(retryTimer)
            stopPinging()
            document.removeEventListener("visibilitychange", pingWhenVisible)
            window.removeEventListener("online", ping)
            // Closing a socket that is still connecting makes the browser log a warning.
            if (socket.readyState === WebSocket.CONNECTING) socket.onopen = () => socket.close()
            else socket.close()
        }
    }, [accessToken, logout, queryClient])

    return children
}
