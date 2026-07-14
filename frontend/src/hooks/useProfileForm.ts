import { useAuth } from "@/auth/useAuth"
import { profileSchema, type ProfileValues } from "@/schemas/users"
import * as usersApi from "../api/users"
import { useState } from "react"
import { ApiError } from "@/api/client"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"


function useProfileForm(onSuccess?: ()=>void) {
    const { accessToken } = useAuth()
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
            if (err instanceof ApiError)
                setServerError(err.message)
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