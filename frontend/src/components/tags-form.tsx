import type { Tag } from "@/types/user"
import { Field, FieldGroup, FieldLabel, FieldError } from "./ui/field"
import { Input } from "./ui/input"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"

type TagsFormProps = { 
    inputValue: string,
    tagsSearchList: Tag[],
    tagsList: Tag[],
    serverError: string | null,
    handleInput: (value: string)=>void,
    handleAddTag: (tag_name: string)=>void,
    handleDeleteTag: (tag_id: number)=>void,
    nextStep?: ()=>void,
    showNextStep: boolean
}

function TagsForm({
    inputValue,
    tagsSearchList,
    tagsList,
    serverError,
    handleInput,
    handleAddTag,
    handleDeleteTag,
    nextStep,
    showNextStep,
}: TagsFormProps) {
    return (
        <>
            <FieldGroup>
                <Field>
                    <FieldLabel htmlFor="user_tags">Choose your personal tags:</FieldLabel>
                    <div className="flex flex-row gap-1">
                        <Input 
                            id="user_tags"
                            type="text"
                            maxLength={50}
                            value={inputValue?? ""}
                            onChange={(e)=>handleInput(e.target.value)}
                            />
                        <Button onClick={()=>handleAddTag(inputValue)}>Add</Button>
                    </div>
                        <div className="flex">
                        {tagsSearchList.length > 0 && (
                                tagsSearchList.map(tag=>(
                                    <Button key={tag.id} onClick={()=>handleAddTag(tag.name)}>
                                    {tag.name} 
                                    </Button>
                                ))
                            )}
                        </div>
                </Field>
                <Field>
                    <div className="flex flex-row flex-wrap gap-3">
                        {tagsList.length > 0 && (
                            tagsList.map(tag=>(
                                <Badge variant="outline" key={tag.id} onClick={()=>handleDeleteTag(tag.id)}>
                                    {tag.name} x
                                </Badge>
                            ))
                        )}
                    </div>
                </Field>
                {tagsList.length < 1 && (
                    <FieldError>You must add at least one tag</FieldError>
                )}
                {serverError && <FieldError>{serverError}</FieldError>}
                {showNextStep && nextStep && (
                    <Field>
                        <Button onClick={()=>nextStep()} disabled={tagsList.length < 1}>Next</Button>
                    </Field>
                )}
            </FieldGroup>          
        </>
    )
}

export default TagsForm