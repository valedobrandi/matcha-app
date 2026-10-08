import type { LocationValues } from "@/schemas/users"
import type { FieldErrors, UseFormRegister } from "react-hook-form"
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from "./ui/field"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Switch } from "./ui/switch"

type LocationFormProps = {
    register: UseFormRegister<LocationValues>,
    errors: FieldErrors<LocationValues>,
    sharePosition: boolean,
    isLocating: boolean,
    locationError: string | null,
    locationLabel: string | null,
    serverError: string | null,
    handleToggle: (checked: boolean) => void,
    handleManuallyLocationInput: (text: string) => void,
    onSubmit: React.SubmitEventHandler<HTMLFormElement>,
}

function LocationForm({
    register,
    errors,
    sharePosition,
    isLocating,
    locationError,
    locationLabel,
    serverError,
    handleToggle,
    handleManuallyLocationInput,
    onSubmit,
}: LocationFormProps) {
    return (
        <form onSubmit={onSubmit} className="flex flex-col gap-4 w-full">
            <FieldGroup>
                <Field>
                    <FieldContent>
                        <FieldLabel htmlFor="share-location">Share your location</FieldLabel>
                        <FieldDescription>
                            Matches are suggested near you. Share your position, or enter your city or neighborhood.
                        </FieldDescription>
                        <Switch id="share-location" checked={sharePosition} onCheckedChange={handleToggle} />
                        {isLocating && <p>Getting your location...</p>}
                        {!isLocating && locationLabel && <p>Your location: {locationLabel}</p>}
                        {!sharePosition && (
                            <>
                                <FieldLabel htmlFor="location_label">City or neighborhood</FieldLabel>
                                <Input id="location_label" type="text" maxLength={100}
                                    {...register("location_label", {
                                        onBlur: (e) => handleManuallyLocationInput(e.target.value)
                                    })} />
                            </>
                        )}
                        {locationError && <FieldError>{locationError}</FieldError>}
                        <FieldError errors={[errors.location_label]} />
                    </FieldContent>
                </Field>
                {serverError && <FieldError>{serverError}</FieldError>}
                <Field>
                    <Button type="submit" disabled={isLocating}>Next</Button>
                </Field>
            </FieldGroup>
        </form>
    )
}

export default LocationForm
