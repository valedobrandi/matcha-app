import { useAuth } from "@/auth/useAuth";
import type { UserProfile } from "@/types/user";
import { useCallback, useEffect, useState } from "react";
import * as usersApi from "../api/users"
import { ApiError } from "../api/client"
import { resolveErrorMessage } from "@/i18n/errors";


function useUserProfile() {
    const { accessToken, logout } = useAuth()
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [error, setError] = useState<string | null>(null)

    const fetchProfile = useCallback(async ()=> {
        if (!accessToken) {
            setProfile(null)
            setIsLoading(false)
            return
        }
        setIsLoading(true)
        setError(null)
        try {
            const user = await usersApi.getUserProfile(accessToken)
            setProfile(user)
            
        } catch (err) {
            if (err instanceof ApiError) {
                setError(resolveErrorMessage(err.code, err.message))
                if (err.code == "USER_NOT_FOUND")
                    logout()
            }
        } finally {
            setIsLoading(false)
        }

    }, [accessToken, logout])

    useEffect(()=>{
        void fetchProfile()
    }, [fetchProfile])

    return { profile, isLoading, error, fetchProfile }
}

export default useUserProfile;