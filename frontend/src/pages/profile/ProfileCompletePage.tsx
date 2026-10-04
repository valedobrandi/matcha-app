import useUserProfile from "@/users/useUserProfile"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/card"
import ProfileForm from "@/components/profile-form"
import useProfileForm from "@/users/useProfileForm"
import { useState } from "react"
import useProfileTags from "@/users/useProfileTags"
import TagsForm from "@/components/tags-form"
import PhotosForm from "@/components/photos-form"
import useProfilePhotos from "@/users/useProfilePhotos"
import { useAuth } from "@/auth/useAuth"
import { useNavigate } from "react-router-dom"

type  CompleteProfileStep = "basic" | "tags" | "photos"

export function ProfileCompletePage() {
  const navigate = useNavigate()
  const { profile } = useUserProfile()
  const { refreshUser } = useAuth()
  const [completeProfileStep, setCompleteProfileStep] = useState<CompleteProfileStep>("basic")
  const {
        register,
        errors,
        control,
        serverError: profileError,
        onSubmit,
  } = useProfileForm(()=>{setCompleteProfileStep("tags")})

  const {
        inputValue,
        tagsSearchList,
        tagsList,
        serverError: tagsError,
        handleInput,
        handleAddTag,
        handleDeleteTag, 
  } = useProfileTags()

  const {
        photoList,
        serverError: photosError,
        handleAddPhoto,
        handleAsAvatar,
        handlePatchPhoto,
        handleDeletePhoto
  } = useProfilePhotos()
  
  const goTags = ()=>{
    setCompleteProfileStep("tags")
  }

  
  const goPhotos = ()=>{
    setCompleteProfileStep("photos")
  }

  const handleFinished = async () => {
    await refreshUser()
    navigate("/")
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Welcome, {profile?.username}</CardTitle>
        <CardDescription>Please complete your profile!</CardDescription>
      </CardHeader>
      <CardContent>
        {completeProfileStep == "basic" && (
          <ProfileForm 
          register={register}
          errors={errors}
          control={control}
          serverError={profileError}
          onSubmit={onSubmit}
          onSuccess={goTags}
          />
        )}
        {completeProfileStep == "tags" && (
          <TagsForm 
            inputValue = {inputValue}
            tagsSearchList = {tagsSearchList}
            tagsList = {tagsList}
            serverError = {tagsError}
            handleInput = {handleInput}
            handleAddTag = {handleAddTag}
            handleDeleteTag = {handleDeleteTag}
            nextStep = {goPhotos}
            showNextStep = {true}
          />
        )}
        {completeProfileStep == "photos" && (
          <PhotosForm
            photoList = {photoList}
            serverError = {photosError}
            handleAddPhoto = {handleAddPhoto}
            handleAsAvatar = {handleAsAvatar}
            handlePatchPhoto = {handlePatchPhoto}
            handleDeletePhoto = {handleDeletePhoto}
            onFinish = {handleFinished}
            showFinish = {true}
          />
        )}
      </CardContent>
    </Card>
  )
}
