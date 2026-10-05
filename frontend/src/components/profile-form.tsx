import type { ProfileValues } from "@/schemas/users"
import type { FieldErrors, UseFormRegister, Control } from "react-hook-form"
import { Controller } from "react-hook-form"
import { Field, FieldGroup, FieldLabel, FieldError } from "./ui/field"
import { Button } from "./ui/button"
import { RadioGroup, RadioGroupItem } from "./ui/radio-group"
import { Label } from "./ui/label"
import { Input } from "./ui/input"

type ProfileFormProps = {
    register: UseFormRegister<ProfileValues>,
    errors: FieldErrors<ProfileValues>,
    control: Control<ProfileValues>
    serverError: string | null,
    onSubmit: React.SubmitEventHandler<HTMLFormElement>,
    onSuccess: () => void
}

function ProfileForm({
    register,
    errors,
    control,
    serverError,
    onSubmit,
}: ProfileFormProps) {
    return (
        <>
            <form onSubmit={onSubmit} className="flex flex-col gap-4 w-full">
                <Controller
                    name="gender"
                    control={control}
                    render={({ field, fieldState })=>(
                        <>
                            <RadioGroup
                                value={field.value ?? "unspecified"}
                                onValueChange={v => field.onChange(v == "unspecified" ? undefined : v)}>
                                <div className="flex flex-row flex-wrap min-[600px]:flex-nowrap justify-between items-center gap-4 w-full">
                                    <p>Please select your gender: </p>
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
                        </>
                    )}
                />
                <Controller
                    name="sexual_preference"
                    control={control}
                    render={({field, fieldState})=>(
                        <>
                            <RadioGroup
                                value={field.value?? ""} onValueChange={field.onChange}>
                                    <div className="flex flex-row flex-wrap min-[600px]:flex-nowrap justify-between items-center gap-4 w-full">
                                        <p>Please select your sexual preference: </p>
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
                        </>
                    )}
                />
                <FieldGroup>
                    <Field>
                        <div className="flex flex-row gap-3 items-center justify-between">
                            <FieldLabel htmlFor="age">Age</FieldLabel>
                            <Input
                                id="age"
                                type="number"
                                aria-invalid={!!errors.age}
                                className="w-[20%]"
                                {...register('age', { valueAsNumber: true })}
                                />
                            <FieldError errors={[errors.age]} />
                        </div>
                    </Field>
                    <Field>
                        <FieldLabel htmlFor="user_bio">Bio</FieldLabel>
                        <textarea id="user_bio"
                            placeholder="Please describe yourself..."
                            aria-invalid={!!errors.bio}
                            {...register('bio')} />
                        <FieldError errors={[errors.bio]} />
                    </Field>
                    {serverError && <FieldError>{serverError}</FieldError>}
                    <Field>
                        <Button type="submit">Next</Button>
                    </Field>
                </FieldGroup>
            </form>
        </>

    )
}

export default ProfileForm
