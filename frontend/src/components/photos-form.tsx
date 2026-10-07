import { Field, FieldGroup, FieldLabel, FieldDescription, FieldError } from "./ui/field"
import { Input } from "./ui/input"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import type { Photo } from "@/types/user"
import { API_BASE_URL } from "@/api/client"
import { useRef, useState } from "react"

type PhotosFormProps = {
    photoList: Photo[],
    serverError: string | null,
    handleAddPhoto: (photo_input: File)=>void,
    handleAsAvatar: (photo_id: number)=>void,
    handlePatchPhoto: (photo_id: number, photo_input: File)=>void,
    handleDeletePhoto: (photo_id: number)=>void
    onFinish?: ()=>void,
    showFinish: boolean
}

function PhotosForm({
    photoList,
    serverError,
    handleAddPhoto,
    handleAsAvatar,
    handlePatchPhoto,
    handleDeletePhoto,
    onFinish,
    showFinish,
} : PhotosFormProps) {
    const [ modify, setModify ] = useState(false)
    const [ photoId, setPhotoId] = useState<number | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleModify = (id: number) => {
        setPhotoId(id)
        setModify(true)        
    }

    const handleAvatar = () => {
        if (!photoId)
            return 
        handleAsAvatar(photoId)
        setModify(false)
    }

    const handleUpload = () => {
        fileInputRef.current?.click()
        setModify(false)
    }
    
    const handleDelete = () => {
        if (!photoId)
            return 
        handleDeletePhoto(photoId)
        setModify(false)
    }

    return (
        <>
            <FieldGroup className="flex flex-col gap-4 w-full">
                <Field>
                    <FieldLabel htmlFor="user_photos">Please upload your photos:</FieldLabel>
                    <FieldDescription>Up to 5 photos. Choose one as your profile photo.</FieldDescription>
                    <Input 
                        id="user_photos"
                        type="file"
                        accept="image/*"
                        onChange={(e)=> {
                            const file = e.target.files?.[0]
                            if (file)
                                handleAddPhoto(file)
                        }}                        
                    />
                </Field>
                {serverError && (<FieldError>{serverError}</FieldError>)}
                {modify && (
                    <ul>
                        <li>
                            <Button onClick={handleAvatar}>Use as profile photo</Button>
                        </li>
                        <li>
                            <Button onClick={handleUpload}>Update a new photo</Button>
                        </li>
                        <li>
                            <Button onClick={handleDelete}>Delete photo</Button>
                        </li>
                        <li>
                            <Button onClick={()=>setModify(false)}>Cancel</Button>
                        </li>
                    </ul>
                )}
                <Field>
                    <FieldLabel htmlFor="user_photos"></FieldLabel>
                    <Input
                        ref={fileInputRef}
                        id="user_photos"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e)=> {
                            const file = e.target.files?.[0]
                            if (file && photoId)
                                handlePatchPhoto(photoId, file)
                        }}
                    />
                </Field>
                {photoList.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {
                        photoList.map(p=>(
                            <div key={p.id} style={{position: "relative"}}>
                            <img
                                src={`${API_BASE_URL}${p.url}`}
                                onClick={()=>handleModify(p.id)}
                                className="w-34 h-34 md:w-54 md:h-54 object-cover rounded cursor-pointer"
                                />
                            {p.is_profile_photo && (
                                <Badge variant="secondary" className="absolute top-1 left-1">
                                    Profile photo
                                </Badge>
                            )}
                        </div>
                        ))
                    }
                    </div>
                )}
                {photoList?.length < 1 && (
                    <FieldError>You should upload minimum one photo.</FieldError>
                )}
                {photoList?.length > 0 && !photoList.find(p=>p.is_profile_photo) && (
                    <FieldError>You should choose one photo as your profile photo.</FieldError>
                )}
                {showFinish && onFinish && (
                    <Field>
                        <Button onClick={()=>onFinish()} disabled={photoList.length < 1 || !photoList.find(p=>p.is_profile_photo)}>Finish</Button>
                    </Field>
                )}
            </FieldGroup>
        </>
    )
}

export default PhotosForm