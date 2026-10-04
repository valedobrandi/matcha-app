import { useAuth } from "@/auth/useAuth"
import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toServerMessage } from "@/hooks/useServerError"
import {
    getMyPhotos,
    postProfilePhoto,
    deleteProfilePhoto,
    patchAsAvatar,
    patchPhotoByNew
} from "../api/users"

function useProfilePhotos() {
    const { accessToken } = useAuth()
    const queryClient = useQueryClient()
    const [ actionError, setActionError ] = useState<string | null>(null)

    const myPhotos = useQuery({
        queryKey: ["my-photos", accessToken],
        queryFn: () => getMyPhotos(accessToken!),
        enabled: !!accessToken,
    })

    // Every photo change can alter the avatar, which other queries also show.
    const mutationOptions = {
        onSuccess: () => Promise.all([
            queryClient.invalidateQueries({ queryKey: ["my-photos"] }),
            queryClient.invalidateQueries({ queryKey: ["me"] }),
        ]),
        onError: (err: unknown) => setActionError(toServerMessage(err)),
    }
    const add = useMutation({
        mutationFn: (photo_input: File) => postProfilePhoto(accessToken!, photo_input),
        ...mutationOptions,
    })
    const setAvatar = useMutation({
        mutationFn: (photo_id: number) => patchAsAvatar(accessToken!, photo_id),
        ...mutationOptions,
    })
    const replace = useMutation({
        mutationFn: ({ photo_id, photo_input }: { photo_id: number, photo_input: File }) =>
            patchPhotoByNew(accessToken!, photo_id, photo_input),
        ...mutationOptions,
    })
    const remove = useMutation({
        mutationFn: (photo_id: number) => deleteProfilePhoto(accessToken!, photo_id),
        ...mutationOptions,
    })

    const run = <T,>(mutate: (variables: T) => void) => (variables: T) => {
        setActionError(null)
        mutate(variables)
    }

    return {
        photoList: myPhotos.data ?? [],
        serverError: actionError ?? toServerMessage(myPhotos.error),
        handleAddPhoto: run(add.mutate),
        handleAsAvatar: run(setAvatar.mutate),
        handlePatchPhoto: (photo_id: number, photo_input: File) =>
            run(replace.mutate)({ photo_id, photo_input }),
        handleDeletePhoto: run(remove.mutate),
    }
}

export default useProfilePhotos
