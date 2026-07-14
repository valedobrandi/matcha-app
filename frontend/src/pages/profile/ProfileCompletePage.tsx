import useUserProfile from "@/hooks/useUserProfile"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/card"
import ProfileForm from "@/components/profile-form"
import useProfileForm from "@/hooks/useProfileForm"
import { useState } from "react"

type  CompleteProfileStep = "basic" | "tags" | "photos"

export function ProfileCompletePage() {
  const { profile, isLoading, error, fetchProfile } = useUserProfile()
  const [completeProfileStep, setCompleteProfileStep] = useState<CompleteProfileStep>("basic")
  const {
        register,
        errors,
        isSubmitting,
        control,
        serverError,
        onSubmit,
    } = useProfileForm(()=>{setCompleteProfileStep("tags")})
  
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
          serverError={serverError}
          onSubmit={onSubmit}
          onSuccess={goTags}
          />
        )}
        {completeProfileStep == "tags" && (
          <TagsForm 
          register={register}
          errors={errors}
          isSubmitting={isSubmitting}
          control={control}
          serverError={serverError}
          onSubmit={onSubmit}
          />
        )}
        {completeProfileStep == "photos" && (
          <PhotosForm 
          register={register}
          errors={errors}
          isSubmitting={isSubmitting}
          control={control}
          serverError={serverError}
          onSubmit={onSubmit}
          />
        )}
      </CardContent>
    </Card>
  )
}
