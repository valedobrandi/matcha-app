import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel, FieldContent, FieldDescription, FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import TagsForm from "@/components/tags-form"
import PhotosForm from "@/components/photos-form"
import type { UserProfile } from "@/types/user"
import { Controller } from "react-hook-form"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { useMutation } from "@tanstack/react-query"
import { editProfileSchema, type EditProfileValues } from "@/schemas/users"
import { zodResolver } from "@hookform/resolvers/zod"
import useProfileTags from "@/users/useProfileTags"
import useProfilePhotos from "@/users/useProfilePhotos"
import useLocationInput from "@/users/useLocationInput"
import { useAuth } from "@/auth/useAuth"
import * as usersApi from "../api/users"
import { toServerMessage } from "@/hooks/toServerMessage"
import edit from "@/assets/edit.png"

function ProfileTab({profile, onSaved} : {profile : UserProfile, onSaved: ()=>void}) {
    const { accessToken } = useAuth()
    const [editing, setEditing] = useState<boolean>(false)

    const {
        register,
        control,
        reset,
        setValue,
        handleSubmit,
        formState: { errors },
    } = useForm<EditProfileValues>({
        resolver: zodResolver(editProfileSchema),
        defaultValues: {
            age: profile.age!,
            gender: profile.gender as "male" | "female" | "other",
            sexual_preference: profile.sexual_preference ?? undefined,
            bio: profile.bio!,
            latitude: profile.latitude,
            longitude: profile.longitude,
            location_label: profile.location_label ?? "",
            location_consent: profile.location_consent ?? false,
        }
    })

    const {
        sharePosition,
        locationError,
        isLocating,
        handleToggle,
        handleManuallyLocationInput
    } = useLocationInput(setValue)

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

    const profileUpdate = useMutation({
        mutationFn: (data: EditProfileValues) => usersApi.editUserProfile(accessToken!, data),
        onSuccess: () => {
            setEditing(false)
            onSaved()
        },
    })
    const serverError = toServerMessage(profileUpdate.error)
        ?? (profileUpdate.error ? "Could not save your profile, please try again" : null)

    const handleCancel = () => {
        profileUpdate.reset()
        reset()
        setEditing(false)
    }

    return (
        <Card>
          <CardHeader>
            <div>
                <div className="flex justify-between items-center">
                    <CardTitle>Profile</CardTitle>
                    <Button variant="outline" onClick={()=>setEditing(true)}>
                        <img src={edit} alt="vues" className="w-5 h-5 object-cover rounded cursor-pointer"/>
                    </Button>
                </div>
                <CardDescription>These informations will be shown to public.</CardDescription>
            </div>
            {editing && (
                <div>
                    <Button onClick={handleSubmit(data => profileUpdate.mutate(data))}>Save</Button>
                    <Button variant="outline" onClick={handleCancel}>Cancel</Button>
                </div>
            )}
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <form>
                {serverError && (<FieldError>{serverError}</FieldError>)}
                <FieldGroup>
                    <Field>
                        <div className="flex gap-3 items-center justify-between">
                            <FieldLabel htmlFor="age">Age</FieldLabel>
                            <Input id="age" type="number" disabled={!editing}
                                aria-invalid={!!errors.age}
                                className="w-[20%]"
                                {...register("age", {valueAsNumber: true})} />
                            <FieldError errors={[errors.age]}/>
                        </div>
                    </Field>
                    <Controller
                        name="gender"
                        control={control}
                        render={({ field, fieldState })=>(
                            <Field>
                                <RadioGroup
                                    value={ field.value } onValueChange={field.onChange} disabled={!editing}>
                                    <div className="flex flex-row flex-wrap min-[600px]:flex-nowrap justify-between w-full items-center gap-6">
                                        <p>Gender</p>
                                        <div className="flex flex-row items-center gap-2">
                                            <RadioGroupItem value="male" id="male" />
                                            <Label htmlFor="male">Male</Label>
                                        </div>
                                        <div className="flex flex-row items-center gap-2">
                                            <RadioGroupItem value="female" id="female" />
                                            <Label htmlFor="female">Female</Label>
                                        </div>
                                        <div className="flex flex-row items-center gap-2">
                                            <RadioGroupItem value="other" id="other" />
                                            <Label htmlFor="other">Other</Label>
                                        </div>
                                    </div>
                                </RadioGroup>
                                <FieldError errors={[fieldState.error]} />
                            </Field>
                    )}/>
                    <Controller
                        name="sexual_preference"
                        control={control}
                        render={({field, fieldState})=>(
                        <Field>
                            <RadioGroup
                              value={field.value ?? "unspecified"}
                              onValueChange={v => field.onChange(v == "unspecified" ? undefined : v)}
                              disabled={!editing}>
                                <div className="flex flex-row flex-wrap min-[600px]:flex-nowrap justify-between w-full items-center gap-6">
                                    <p>Sexual_preference</p>
                                    <div className="flex flex-row items-center gap-2">
                                        <RadioGroupItem value="man" id="man" />
                                        <Label htmlFor="man">Man</Label>
                                    </div>
                                    <div className="flex flex-row items-center gap-2">
                                        <RadioGroupItem value="woman" id="woman" />
                                        <Label htmlFor="woman">Woman</Label>
                                    </div>
                                    <div className="flex flex-row items-center gap-2">
                                        <RadioGroupItem value="bisexual" id="bisexual" />
                                        <Label htmlFor="bisexual">Bisexual</Label>
                                    </div>
                                </div>
                            </RadioGroup>
                            <FieldError errors={[fieldState.error]} />
                        </Field>
                    )} />
                    <Field>
                        <FieldLabel htmlFor="user_bio">Bio: </FieldLabel>
                        <textarea id="user_bio" disabled={!editing}
                            placeholder="Please describe yourself..."
                            aria-invalid={!!errors.bio}
                            {...register('bio')} />
                        <FieldError errors={[errors.bio]} />
                    </Field>
                    <Field>
                        <FieldContent>
                            <FieldLabel htmlFor="switch-position-mode">Share your localisation</FieldLabel>
                            <FieldDescription>
                              Share your localisation permisses a good match, otherwise, please entre manually your position.
                            </FieldDescription>
                            <Switch
                                id="switch-position-mode"
                                checked={sharePosition}
                                onCheckedChange={handleToggle}
                                disabled={!editing}/>
                            {isLocating && (<p>Getting your location...</p>)}
                            {!sharePosition && (
                                <Input id="location_label" type="text" disabled={!editing}
                                {...register("location_label", {
                                    onBlur: (e)=>handleManuallyLocationInput(e.target.value)
                                })} />
                            )}
                            {locationError && (<FieldError>{locationError}</FieldError>)}
                            <FieldError errors={[errors.location_label]}/>
                        </FieldContent>
                    </Field>
                </FieldGroup>
                <div className="my-5">
                    <TagsForm
                        inputValue = {inputValue}
                        tagsSearchList = {tagsSearchList}
                        tagsList = {tagsList}
                        serverError = {tagsError}
                        handleInput = {handleInput}
                        handleAddTag = {handleAddTag}
                        handleDeleteTag = {handleDeleteTag}
                        showNextStep = {false}
                    />
                </div>
                <div className="my-5">
                    <PhotosForm
                        photoList = {photoList}
                        serverError = {photosError}
                        handleAddPhoto = {handleAddPhoto}
                        handleAsAvatar = {handleAsAvatar}
                        handlePatchPhoto = {handlePatchPhoto}
                        handleDeletePhoto = {handleDeletePhoto}
                        showFinish = {false}
                        />
                </div>
            </form>
          </CardContent>
        </Card>
    )
}

export default ProfileTab
