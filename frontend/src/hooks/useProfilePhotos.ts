import { useAuth } from "@/auth/useAuth"
import { useCallback, useEffect, useState } from "react"
import type { Photo } from "../types/user"
import { ApiError } from "@/api/client"
import { resolveErrorMessage } from "@/i18n/errors"
import {
    postProfilePhoto
} from "../api/users"

function useProfilePhotos() {
    const { accessToken } = useAuth()
    const [ photoList, setPhotoList] = useState<Photo[]>([])
    const [ serverError, setServerError] = useState<string | null>(null)

    const handleGetMyPhotos = useCallback(async ()=>{
        try {
            const myPhotos = await getMyPhotos(accessToken!)
            setPhotoList(myPhotos)
        } catch (err) {
            if (err instanceof ApiError)
                setServerError(resolveErrorMessage(err.code, err.message))
        }
    }, [accessToken])

    useEffect(()=>{
        void handleGetMyPhotos()
    }, [handleGetMyPhotos])

    const handleAddPhoto = async (photo_input: File) => {
        try {
            const newPhoto: Photo = await postProfilePhoto(accessToken!, photo_input)
            setPhotoList(prev=>([
                ...prev,
                newPhoto
            ]))
        } catch (err) {
            if (err instanceof ApiError)
                setServerError(resolveErrorMessage(err.code, err.message))
        } finally {
            setUrlValue("")
        }
    }

    const handlePatchPhoto = async (photo: Photo) => {
        try {
            const newPhoto: Photo = await patchProfilePhoto(accessToken, photo)
            setPhotoList(prev=>prev.map(p=>(p.id === photo.id? newPhoto : p)))
        } catch (err) {
            if (err instanceof ApiError)
                setServerError(resolveErrorMessage(err.code, err.message))   
        }
    }

    const handleDeletePhoto = async (photo_id: number) => {
        try {
            await deleteProfilePhoto(accessToken, photo_id)
            setPhotoList(prev=>prev.filter((p)=>p.id !== photo_id))
        } catch (err) {
            if (err instanceof ApiError)
                setServerError(resolveErrorMessage(err.code, err.message))   
        }
    }

    return {
        photoList,
        serverError,
        handleGetMyPhotos,
        handleAddPhoto,
        handlePatchPhoto,
        handleDeletePhoto
    }
}

export default useProfilePhotos