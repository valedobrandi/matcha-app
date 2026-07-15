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
    handleMyTags: ()=>Promise<void>,
    handleInput: (value: string)=>Promise<void>,
    handleAddTag: (tag_name: string)=>Promise<void>,
    handleDeleteTag: (tag_id: number)=>Promise<void>,
    nextStep: ()=>void
}

function TagsForm({
    inputValue,
    tagsSearchList,
    tagsList,
    serverError,
    handleMyTags,
    handleInput,
    handleAddTag,
    handleDeleteTag,
    nextStep,
    ...props
}: TagsFormProps) {
    return (
        <>
            <FieldGroup>
                <Field>
                    <FieldLabel htmlFor="tags">Choose your personal tags:</FieldLabel>
                    <Input 
                        id="tags"
                        type="text"
                        value={inputValue?? ""}
                        onChange={(e)=>handleInput(e.target.value)}
                    />
                    {tagsSearchList.length > 0 && (
                        tagsSearchList.map(tag=>(
                        <Button key={tag.id} onClick={()=>handleAddTag(tag.name)}>
                            {tag.name} 
                        </Button>))
                    )}
                    <Button onClick={()=>handleAddTag(inputValue)}>Add</Button>
                </Field>
                <Field>
                    {tagsList.length > 0 && (
                        tagsList.map(tag=>(
                            <Badge variant="outline" key={tag.id} onClick={()=>handleDeleteTag(tag.id)}>
                                {tag.name} x
                            </Badge>
                        ))
                    )}
                </Field>
                {serverError && <FieldError>{serverError}</FieldError>}
                <Field>
                    <Button onClick={()=>nextStep()}>Next</Button>
                </Field>
            </FieldGroup>          
        </>
    )
}

export default TagsForm