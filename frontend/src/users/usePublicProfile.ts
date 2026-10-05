import { useAuth } from "@/auth/useAuth";
import { useQuery } from "@tanstack/react-query";
import * as usersApi from "@/api/users"
import * as socialApi from "@/api/social"
import { toServerMessage } from "@/hooks/toServerMessage";

export function usePublicProfile(target_id: number) {
    const {accessToken} = useAuth()
    const relationshipQuery = useQuery({
        queryKey: ["relationship", target_id, accessToken],
        queryFn: () => socialApi.getRelationship(accessToken!, target_id),
        enabled: !!accessToken,
    })
    // A failed refetch keeps the old data in the cache. Never show it: the target may have
    // blocked the viewer since, and the API now answers as for a missing user (ADR-0007).
    const relationship = relationshipQuery.isError ? null : relationshipQuery.data ?? null
    // A block hides the profile from both sides, so it is not requested when the viewer blocked the target.
    const canSeeProfile = relationship !== null && !relationship.blocked_by_me
    const profileQuery = useQuery({
        queryKey: ["public-profile", target_id, accessToken],
        queryFn: () => usersApi.getPublicProfile(accessToken!, target_id),
        enabled: !!accessToken && canSeeProfile,
    })
    const serverError = toServerMessage(relationshipQuery.error ?? (canSeeProfile ? profileQuery.error : null))

    const publicProfile = canSeeProfile && !profileQuery.isError ? profileQuery.data ?? null : null
    const profileAvatar = publicProfile?.photos.find(p => p.is_profile_photo)?.url ?? null
    const isLoading = relationshipQuery.isFetching || profileQuery.isFetching
        || (canSeeProfile && profileQuery.isPending)

    return {relationship, publicProfile, profileAvatar, isLoading, serverError}
}
