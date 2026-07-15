import { Field, FieldGroup, FieldLabel, FieldDescription, FieldError } from "./ui/field"
import { Input } from "./ui/input"
import { Button } from "./ui/button"

function PhotosForm() {

    return (
        <>
            <FieldGroup>
                <Field>
                    <FieldLabel htmlFor="user_photos">Please upload your photos:</FieldLabel>
                    <FieldDescription>Maximun 5 photos, and please choose one as your profile photo.</FieldDescription>
                    <Input 
                        id="user_photos"
                        type="text"
                        placeholder="Please choose your local photo or add an url..."
                    />
                    <Button></Button>
                </Field>
            </FieldGroup>
        </>
    )
}

export default PhotosForm