import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import useProfileTags from "@/users/useProfileTags"
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
    const { inputValue, tagsSearchList, handleInput} = useProfileTags()

    const patchValue = (partial: Partial<AdvancedFilters>) => {
        onChange({...value, ...partial})
    }

    const handleCommonTags = (tagId: number) => {
        const tagIds = value.tagIds.includes(tagId)
            ? value.tagIds.filter(id => id !== tagId)
            : [...value.tagIds, tagId]
        patchValue({tagIds})
    }

    return (
        <div>
            <div className="mx-auto grid w-full my-8 gap-3">
                <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium leading-none">Age</span>
                    <span className="text-sm text-muted-foreground">
                        {value.ageRange.join(", ")}
                    </span>
                </div>
                <Slider
                    id="slider-age"
                    value={value.ageRange}
                    onValueChange={(v) => patchValue({ageRange: v as number[]})}
                    min={18}
                    max={100}
                    step={1}
                />
            </div>
            <div className="mx-auto grid w-full my-8 gap-3">
                <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium leading-none">Fame</span>
                    <span className="text-sm text-muted-foreground">
                        {value.fameRange.join(", ")}
                    </span>
                </div>
                <Slider
                    id="slider-fame"
                    value={value.fameRange}
                    onValueChange={(v) => patchValue({fameRange: v as number[]})}
                    min={0}
                    max={100}
                    step={5}
                />
            </div>
            <div className="mx-auto grid w-full my-8 gap-3">
                <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium leading-none">Max distance km</span>
                    {value.maxDistance && (
                        <span className="text-sm text-muted-foreground">
                            {value.maxDistance} km
                        </span>
                    )}
                </div>
                {value.maxDistance && (
                    <Slider
                    id="slider-distance"
                    value={value.maxDistance}
                    onValueChange={(v) => {
                            const distance = Array.isArray(v) ? v : [v]
                            patchValue({maxDistance: distance})
                        }}
                        min={1}
                        max={100}
                        step={20}
                    />
                )}
                <div className="flex items-center gap-2">
                    <Checkbox 
                        checked={value.maxDistance === null}
                        onCheckedChange={(checked) => 
                            patchValue({maxDistance: checked? null : [20]})
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
            <div className="mx-auto my-4 flex flex-wrap gap-1">
                {tagsSearchList.length > 0 && (
                    tagsSearchList.map(tag=>{
                        const isSelected = value.tagIds.includes(tag.id)
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