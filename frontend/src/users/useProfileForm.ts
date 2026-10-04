import { useAuth } from "@/auth/useAuth"
import { profileSchema, type ProfileValues } from "@/schemas/users"
import * as usersApi from "../api/users"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { zodResolver } from "@hookform/resolvers/zod"
import { toServerMessage } from "@/hooks/toServerMessage"
import useUserProfile from "./useUserProfile"


function useProfileForm(onSuccess?: ()=>void) {
    const { accessToken } = useAuth()
    const queryClient = useQueryClient()
    const { profile: userInfo, error: loadError } = useUserProfile()
    const {
        register,
        handleSubmit,
        control,
        reset,
        formState: {errors},
    } = useForm<ProfileValues>({
        resolver: zodResolver(profileSchema),
    })

    useEffect(()=>{
        if (userInfo) {
            reset({
                gender: userInfo.gender ?? undefined,
                sexual_preference: userInfo.sexual_preference ?? undefined,
                age: userInfo.age ?? undefined,
                bio: userInfo.bio ?? "",
            } as ProfileValues)
        }
    }, [userInfo, reset])

    const update = useMutation({
        mutationFn: (data: ProfileValues) => usersApi.updateUserProfile(accessToken!, data),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["me"] })
            onSuccess?.()
        },
    })
    const submitError = toServerMessage(update.error)

    return {
        register,
        errors,
        control,
        serverError: submitError ?? loadError,
        onSubmit: handleSubmit(data => update.mutate(data)),
        userInfo,
    }
}

export default useProfileForm
