import type { QueryClient } from "@tanstack/react-query"
import { invalidateNotifications } from "@/notifications/queryKeys"

// Every query that hides blocked users, or counts what those lists show (ADR-0005).
// The public profile is left out: usePublicProfile requests it again once the
// relationship says the block is gone.
const BLOCK_SENSITIVE_KEYS = [
    "relationship", "blocks", "suggested-profiles", "search-profiles", "search-list",
    "visitors", "likes-received", "me",
]

export function invalidateBlockedUserViews(queryClient: QueryClient) {
    return Promise.all([
        ...BLOCK_SENSITIVE_KEYS.map(
            queryKey => queryClient.invalidateQueries({ queryKey: [queryKey] })
        ),
        invalidateNotifications(queryClient),
    ])
}
