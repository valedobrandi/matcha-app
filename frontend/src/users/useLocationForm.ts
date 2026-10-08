import { useAuth } from "@/auth/useAuth"
import { locationSchema, type LocationValues } from "@/schemas/users"
import * as usersApi from "../api/users"
import { useForm, useWatch } from "react-hook-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { zodResolver } from "@hookform/resolvers/zod"
import { toServerMessage } from "@/hooks/toServerMessage"
import useLocationInput from "./useLocationInput"

function useLocationForm(onSuccess: () => void) {
    const { accessToken } = useAuth()
    const queryClient = useQueryClient()
    const {
        register,
        handleSubmit,
        setValue,
        control,
        formState: { errors },
    } = useForm<LocationValues>({
        resolver: zodResolver(locationSchema),
        defaultValues: { latitude: null, longitude: null, location_label: "", location_consent: false },
    })

    const [locationLabel, latitude] = useWatch({ control, name: ["location_label", "latitude"] })

    const location = useLocationInput(found => {
        setValue("latitude", found.latitude)
        setValue("longitude", found.longitude)
        setValue("location_label", found.location_label)
        setValue("location_consent", found.location_consent)
    })

    const save = useMutation({
        mutationFn: (values: LocationValues) => usersApi.updateUserLocation(accessToken!, values),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["me"] })
            onSuccess()
        },
    })

    return {
        ...location,
        register,
        errors,
        locationLabel: latitude === null ? null : locationLabel,
        serverError: toServerMessage(save.error) ?? (save.error ? "Could not save your location, please try again" : null),
        onSubmit: handleSubmit(values => save.mutate(values)),
    }
}

export default useLocationForm
