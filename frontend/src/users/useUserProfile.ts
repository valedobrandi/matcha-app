import { useAuth } from "@/auth/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as usersApi from "../api/users"
import { useServerError } from "@/hooks/useServerError";

function useUserProfile() {
    const { accessToken } = useAuth()
    const queryClient = useQueryClient()
    const query = useQuery({
        queryKey: ["me", accessToken],
        queryFn: () => usersApi.getUserProfile(accessToken!),
        enabled: !!accessToken,
    })
    const error = useServerError(query.error)

    const fetchProfile = () => queryClient.invalidateQueries({ queryKey: ["me"] })

    return { profile: query.data ?? null, isLoading: query.isLoading, error, fetchProfile }
}

export default useUserProfile;
