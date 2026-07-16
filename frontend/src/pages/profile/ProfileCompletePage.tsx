import useUserProfile from "@/hooks/useUserProfile"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/card"
import ProfileForm from "@/components/profile-form"
import useProfileForm from "@/hooks/useProfileForm"
import { useState } from "react"
import useProfileTags from "@/hooks/useProfileTags"
import TagsForm from "@/components/tags-form"
import PhotosForm from "@/components/photos-form"
import useProfilePhotos from "@/hooks/useProfilePhotos"

type  CompleteProfileStep = "basic" | "tags" | "photos"

export function ProfileCompletePage() {
  const { profile, isLoading, error, fetchProfile } = useUserProfile()
  const [completeProfileStep, setCompleteProfileStep] = useState<CompleteProfileStep>("basic")
  const {
        register,
        errors,
        isSubmitting,
        control,
        serverError: profileError,
        onSubmit,
  } = useProfileForm(()=>{setCompleteProfileStep("tags")})

  const {
        inputValue,
        tagsSearchList,
        tagsList,
        serverError: tagsError,
        handleMyTags,
        handleInput,
        handleAddTag,
        handleDeleteTag, 
  } = useProfileTags()

  const {
        photoList,
        serverError: photosError,
        handleGetMyPhotos,
        handleAddPhoto,
        // handlePatchPhoto,
        handleDeletePhoto
  } = useProfilePhotos()
  
  const goTags = ()=>{
    setCompleteProfileStep("tags")
  }

  
  const goPhotos = ()=>{
    setCompleteProfileStep("photos")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome, {profile?.username}</CardTitle>
        <CardDescription>Please complete your profile!</CardDescription>
      </CardHeader>
      <CardContent>
        {completeProfileStep == "basic" && (
          <ProfileForm 
          register={register}
          errors={errors}
          isSubmitting={isSubmitting}
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
            handleMyTags = {handleMyTags}
            handleInput = {handleInput}
            handleAddTag = {handleAddTag}
            handleDeleteTag = {handleDeleteTag}
            nextStep = {goPhotos}
          />
        )}
        {completeProfileStep == "photos" && (
          <PhotosForm
            photoList = {photoList}
            serverError = {photosError}
            handleGetMyPhotos = {handleGetMyPhotos}
            handleAddPhoto = {handleAddPhoto}
            // handlePatchPhoto = {handlePatchPhoto}
            handleDeletePhoto = {handleDeletePhoto}
          />
        )}
      </CardContent>
    </Card>
  )
}
