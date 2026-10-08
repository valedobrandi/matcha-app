import { useState } from "react"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useTagSearch } from "@/discovery/useTagSearch"
import { Checkbox } from "@/components/ui/checkbox"

export interface AdvancedFilters {
    ageRange: number[]
    fameRange: number[]
    maxDistance: number[] | null
    tagIds: number[]
}

interface AdvancedSearchFormProps {
    value: AdvancedFilters
    onChange: (value: AdvancedFilters) => void
}

function AdvancedSearchForm({value, onChange} : AdvancedSearchFormProps) {
    const { inputValue, tagsSearchList, serverError, handleInput } = useTagSearch()
    const [draft, setDraft] = useState(value)

    const moveThumbs = (partial: Partial<AdvancedFilters>) => {
        setDraft(current => ({...current, ...partial}))
    }

    const commit = (partial: Partial<AdvancedFilters>) => {
        const next = {...draft, ...partial}
        setDraft(next)
        onChange(next)
    }

    const handleCommonTags = (tagId: number) => {
        const tagIds = draft.tagIds.includes(tagId)
            ? draft.tagIds.filter(id => id !== tagId)
            : [...draft.tagIds, tagId]
        commit({tagIds})
    }

    return (
        <div>
            <div className="mx-auto grid w-full my-8 gap-3">
                <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium leading-none">Age</span>
                    <span className="text-sm text-muted-foreground">
                        {draft.ageRange.join(", ")}
                    </span>
                </div>
                <Slider
                    id="slider-age"
                    value={draft.ageRange}
                    onValueChange={(v) => moveThumbs({ageRange: v as number[]})}
                    onValueCommitted={(v) => commit({ageRange: v as number[]})}
                    min={18}
                    max={100}
                    step={1}
                />
            </div>
            <div className="mx-auto grid w-full my-8 gap-3">
                <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium leading-none">Fame</span>
                    <span className="text-sm text-muted-foreground">
                        {draft.fameRange.join(", ")}
                    </span>
                </div>
                <Slider
                    id="slider-fame"
                    value={draft.fameRange}
                    onValueChange={(v) => moveThumbs({fameRange: v as number[]})}
                    onValueCommitted={(v) => commit({fameRange: v as number[]})}
                    min={0}
                    max={100}
                    step={5}
                />
            </div>
            <div className="mx-auto grid w-full my-8 gap-3">
                <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium leading-none">Max distance km</span>
                    {draft.maxDistance && (
                        <span className="text-sm text-muted-foreground">
                            {draft.maxDistance} km
                        </span>
                    )}
                </div>
                {draft.maxDistance && (
                    <Slider
                    id="slider-distance"
                    value={draft.maxDistance}
                    onValueChange={(v) => moveThumbs({maxDistance: Array.isArray(v) ? v : [v]})}
                    onValueCommitted={(v) => commit({maxDistance: Array.isArray(v) ? v : [v]})}
                        min={1}
                        max={100}
                        step={20}
                    />
                )}
                <div className="flex items-center gap-2">
                    <Checkbox 
                        checked={draft.maxDistance === null}
                        onCheckedChange={(checked) => 
                            commit({maxDistance: checked? null : [20]})
                        }
                    />
                    <FieldLabel className="text-sm font-medium leading-none">Any distance</FieldLabel>
                </div>
            </div>
            <div className="mx-auto flex flex-row gap-1">
                <Input 
                    id="user_tags"
                    type="text"
                    placeholder="Searching commun tags..."
                    value={inputValue?? ""}
                    onChange={(e)=>handleInput(e.target.value)}
                />
            </div>
            {serverError && <FieldError>{serverError}</FieldError>}
            <div className="mx-auto my-4 flex flex-wrap gap-1">
                {tagsSearchList.length > 0 && (
                    tagsSearchList.map(tag=>{
                        const isSelected = draft.tagIds.includes(tag.id)
                        return (
                            <Button
                                key={tag.id}
                                variant={isSelected? "default" : "secondary"}
                                onClick={()=>handleCommonTags(tag.id)}>
                                {tag.name}
                            </Button>
                        )
                    })
                )}
            </div>
        </div>
    )
}

export default AdvancedSearchForm