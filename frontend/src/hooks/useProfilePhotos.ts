import { useAuth } from "@/auth/useAuth"
import { useCallback, useEffect, useState } from "react"
import type { Photo } from "../types/user"
import { ApiError } from "@/api/client"
import { resolveErrorMessage } from "@/i18n/errors"
import {
    getMyPhotos,
    postProfilePhoto,
    deleteProfilePhoto,
    patchAsAvatar,
    patchPhotoByNew
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
        setServerError(null)
        try {
            const newPhoto: Photo = await postProfilePhoto(accessToken!, photo_input)
            setPhotoList(prev=>([
                ...prev,
                newPhoto
            ]))
        } catch (err) {
            if (err instanceof ApiError)
                setServerError(resolveErrorMessage(err.code, err.message))
        }
    }

    const handleAsAvatar = async (photo_id: number) => {
        setServerError(null)
        try {
            await patchAsAvatar(accessToken!, photo_id)
            await handleGetMyPhotos()
        } catch (err) {
            if (err instanceof ApiError)
                setServerError(resolveErrorMessage(err.code, err.message))   
        }   
    }

    const handlePatchPhoto = async (photo_id: number, photo_input: File) => {
        setServerError(null)
        try {
            const newPhoto: Photo = await patchPhotoByNew(accessToken!, photo_id, photo_input)
            setPhotoList(prev=>prev.map(p=>(p.id === photo_id? newPhoto : p)))
        } catch (err) {
            if (err instanceof ApiError)
                setServerError(resolveErrorMessage(err.code, err.message))   
        }
    }

    const handleDeletePhoto = async (photo_id: number) => {
        setServerError(null)
        try {
            await deleteProfilePhoto(accessToken!, photo_id)
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
        handleAsAvatar,
        handlePatchPhoto,
        handleDeletePhoto
    }
}

export default useProfilePhotos