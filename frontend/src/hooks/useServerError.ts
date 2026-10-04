import { useEffect } from "react"
import { ApiError } from "@/api/client"
import { useAuth } from "@/auth/useAuth"
import { resolveErrorMessage } from "@/i18n/errors"

export function toServerMessage(error: unknown): string | null {
    return error instanceof ApiError ? resolveErrorMessage(error.code, error.message) : null
}

// Maps a query/mutation error to the user-facing message. A USER_NOT_FOUND
// error means the session points to a deleted account, so it also logs out.
export function useServerError(error: unknown): string | null {
    const { logout } = useAuth()

    useEffect(()=>{
        if (error instanceof ApiError && error.code === "USER_NOT_FOUND")
            logout()
    }, [error, logout])

    return toServerMessage(error)
}
