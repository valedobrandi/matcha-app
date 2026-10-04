import { useAuth } from "@/auth/useAuth";
import { useQuery } from "@tanstack/react-query";
import * as usersApi from "@/api/users"
import * as socialApi from "@/api/social"
import { useServerError } from "@/hooks/useServerError";

export function usePublicProfile(target_id: number) {
    const {accessToken} = useAuth()
    const relationshipQuery = useQuery({
        queryKey: ["relationship", target_id, accessToken],
        queryFn: () => socialApi.getRelationship(accessToken!, target_id),
        enabled: !!accessToken,
    })
    // Fetched only after the relationship: a block makes the profile request fail.
    const profileQuery = useQuery({
        queryKey: ["public-profile", target_id, accessToken],
        queryFn: () => usersApi.getPublicProfile(accessToken!, target_id),
        enabled: !!accessToken && relationshipQuery.isSuccess,
    })
    const serverError = useServerError(relationshipQuery.error ?? profileQuery.error)

    const relationship = relationshipQuery.data ?? null
    const publicProfile = profileQuery.data ?? null
    const profileAvatar = publicProfile?.photos.find(p => p.is_profile_photo)?.url ?? null
    const isLoading = relationshipQuery.isFetching || profileQuery.isFetching
        || (relationshipQuery.isSuccess && profileQuery.isPending)

    return {relationship, publicProfile, profileAvatar, isLoading, serverError}
}
