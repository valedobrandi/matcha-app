import { Field, FieldGroup, FieldLabel, FieldDescription, FieldError } from "./ui/field"
import { Input } from "./ui/input"
import { Button } from "./ui/button"
import type { Photo } from "@/types/user"
import { API_BASE_URL } from "@/api/client"
import { useState } from "react"

type PhotosFormProps = {
    photoList: Photo[],
    serverError: string | null,
    handleGetMyPhotos: ()=>Promise<void>,
    handleAddPhoto: (photo_input: File)=>Promise<void>,
    handlePatchPhoto: (photo: Photo)=>Promise<void>,
    handleDeletePhoto: (photo_id: number)=>Promise<void>
}

function PhotosForm({
    photoList,
    serverError,
    handleGetMyPhotos,
    handleAddPhoto,
    handlePatchPhoto,
    handleDeletePhoto,
    ...props
} : PhotosFormProps) {
    const [ modify, setModify ] = useState(false)

    return (
        <>
            <FieldGroup>
                <Field>
                    <FieldLabel htmlFor="user_photos">Please upload your photos:</FieldLabel>
                    <FieldDescription>Maximun 5 photos, and please choose one as your profile photo.</FieldDescription>
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
                            <Button>Use as profile photo</Button>
                        </li>
                        <li>
                            <Button>Update a new photo</Button>
                        </li>
                        <li>
                            <Button>Delete photo</Button>
                        </li>
                        <li>
                            <Button onClick={()=>setModify(false)}>Cancel</Button>
                        </li>
                    </ul>
                )}
                {photoList.length > 0 && (
                    photoList.map(p=>(
                        <img
                            key={p.id}
                            src={`${API_BASE_URL}${p.url}`}
                            onClick={()=>setModify(true)}
                        />
                    ))
                )}
            </FieldGroup>
        </>
    )
}

export default PhotosForm