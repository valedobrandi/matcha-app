import { ApiError } from "@/api/client"
import { resolveErrorMessage } from "@/i18n/errors"

export function toServerMessage(error: unknown): string | null {
    return error instanceof ApiError ? resolveErrorMessage(error.code, error.message) : null
}
