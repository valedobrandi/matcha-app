import { useAuth } from "@/auth/useAuth"
import { profileSchema, type ProfileValues } from "@/schemas/users"
import * as usersApi from "../api/users"
import { useState } from "react"
import { ApiError } from "@/api/client"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { resolveErrorMessage } from "@/i18n/errors"


function useProfileForm(onSuccess?: ()=>void) {
    const { accessToken, logout } = useAuth()
    const [ serverError, setServerError ] = useState<string | null>(null)
    const {
        register,
        handleSubmit,
        control,
        formState: {errors, isSubmitting},
    } = useForm<ProfileValues>({
        resolver: zodResolver(profileSchema),
    })

    const onSubmit = async (data: ProfileValues) => {
        try {
            await usersApi.updateUserProfile(accessToken!, data)
            onSuccess?.()
        } catch(err) {
            if (err instanceof ApiError) {
                setServerError(resolveErrorMessage(err.code, err.message))
                if (err.code == "USER_NOT_FOUND")
                    logout()
            }
        }
    }
    return {
        register,
        errors,
        isSubmitting,
        control,
        serverError,
        onSubmit: handleSubmit(onSubmit)
    }
}

export default useProfileForm