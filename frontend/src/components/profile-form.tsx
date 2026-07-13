import type { ProfileValues } from "@/schemas/users"
import type { FieldErrors, UseFormRegister, Control } from "react-hook-form"
import { Controller } from "react-hook-form"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./ui/card"
import { Field, FieldGroup, FieldLabel, FieldError } from "./ui/field"
import { Button } from "./ui/button"
import { RadioGroup, RadioGroupItem } from "./ui/radio-group"
import { Label } from "./ui/label"
import { Input } from "./ui/input"


type ProfileFormProps = {
    register: UseFormRegister<ProfileValues>,
    errors: FieldErrors<ProfileValues>,
    isSubmitting: boolean,
    control: Control<ProfileValues>
    serverError: string | null,
    onSubmit: React.SubmitEventHandler<HTMLFormElement>
}

function ProfileForm({
    register,
    errors,
    isSubmitting,
    control,
    serverError,
    onSubmit,
    ...props
}: ProfileFormProps) {
    return (
        <>
            <form onSubmit={onSubmit}>
                <Controller 
                    name="gender"
                    control={control}
                    render={({ field, fieldState })=>(
                        <>
                            <RadioGroup
                                defaultValue="male" value={field.value} onValueChange={field.onChange}>
                                <p>Please select your gender: </p>
                                <div>
                                    <RadioGroupItem value="male" id="male" />
                                    <Label htmlFor="male">Male</Label>
                                </div>        
                                <div>
                                    <RadioGroupItem value="female" id="female" />
                                    <Label htmlFor="female">Female</Label>
                                </div>        
                                <div>
                                    <RadioGroupItem value="other" id="other" />
                                    <Label htmlFor="other">Other</Label>
                                </div>        
                            </RadioGroup>
                            <FieldError errors={[fieldState.error]} />
                        </>
                    )}
                />
                <Controller 
                    name="sexual_preference"
                    control={control}
                    render={({field, fieldState})=>(
                        <>
                            <RadioGroup
                                defaultValue="man" value={field.value} onValueChange={field.onChange}>
                                    <p>Please select your sexual preference: </p>
                                    <div>
                                        <RadioGroupItem value="man" id="man" />
                                        <Label htmlFor="man">Man</Label>
                                    </div>        
                                    <div>
                                        <RadioGroupItem value="woman" id="woman" />
                                        <Label htmlFor="woman">Woman</Label>
                                    </div>        
                                    <div>
                                        <RadioGroupItem value="bisexual" id="bisexual" />
                                        <Label htmlFor="bisexual">Bisexual</Label>
                                    </div>        
                            </RadioGroup>
                            <FieldError errors={[fieldState.error]} />
                        </>
                    )}
                />
                <FieldGroup>
                    <Field>
                        <FieldLabel htmlFor="age">Age</FieldLabel>
                        <Input
                            id="age"
                            type="number"
                            aria-invalid={!!errors.age}
                            {...register('age', { valueAsNumber: true })}
                            />
                        <FieldError errors={[errors.age]} />
                    </Field>
                    <Field>
                        <FieldLabel htmlFor="user_bio">Bio: </FieldLabel>
                        <textarea id="user_bio"
                            placeholder="Please describe yourself..."
                            aria-invalid={!!errors.bio}
                            {...register('bio')} />
                        <FieldError errors={[errors.bio]} />
                    </Field>
                    {serverError && <FieldError>{serverError}</FieldError>}
                    <Field>
                        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Saved"}</Button>
                    </Field>
                </FieldGroup>
            </form>
        </>

    )
}

export default ProfileForm