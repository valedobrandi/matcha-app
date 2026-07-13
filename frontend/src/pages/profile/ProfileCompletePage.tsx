import useUserProfile from "@/hooks/useUserProfile"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/card"
import ProfileForm from "@/components/profile-form"
import useProfileForm from "@/hooks/useProfileForm"


export function ProfileCompletePage() {
  const { profile, isLoading, error, fetchProfile } = useUserProfile()
  const {
        register,
        errors,
        isSubmitting,
        control,
        serverError,
        onSubmit,
    } = useProfileForm()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome, {profile?.username}!</CardTitle>
        <CardDescription>Please complete your profile!</CardDescription>
      </CardHeader>
      <CardContent>
      <ProfileForm 
        register={register}
        errors={errors}
        isSubmitting={isSubmitting}
        control={control}
        serverError={serverError}
        onSubmit={onSubmit}
      />
      </CardContent>
    </Card>
  )
}
