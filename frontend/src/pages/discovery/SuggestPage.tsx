import { ProfileCard } from "@/components/ProfileCard"
import { SelectFilter } from "@/components/selectFilter"
import useSuggestedProfiles from "@/discovery/useSuggestedProfiles"
import type { SuggestQueryParamsValues } from "@/schemas/discovery"
import { useLikes } from "@/social/useLikes"
import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import AdvancedSearchForm, { type AdvancedFilters } from "@/components/AdvancedSearchForm"
import useSearchProfiles from "@/discovery/useSearchProfiles"

export const limitList = [
    { label: "Limit", value: null },
    { label: "1", value: "1" },
    { label: "10", value: "10" },
    { label: "20", value: "20" },
    { label: "40", value: "40" }
]

const sortList = [
    { label: "Sort by", value: null },
    { label: "age", value: "age" },
    { label: "distance", value: "distance" },
    { label: "fame", value: "fame" },
    { label: "tags", value: "common_tags" },
]

const orderList = [
    { label: "Order by", value: null },
    { label: "asc", value: "asc" },
    { label: "desc", value: "desc" },
]

type SortValue = SuggestQueryParamsValues["sort"]
type OrderValue = SuggestQueryParamsValues["order"]
const DEFAULT_ADVANCED: AdvancedFilters = {
    ageRange: [18, 65],
    fameRange: [0, 100],
    maxDistance: [20],
    tagIds: [],
}

function SuggestPage() {
    const [limit, setLimit ] = useState("20")
    const [sort, setSort ] = useState<SortValue>(undefined)
    const [order, setOrder ] = useState<OrderValue>(undefined)
    const [advancedSearch, setAdvancedSearch ] = useState(false)
    const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>(DEFAULT_ADVANCED)

    const base = useMemo(()=>({
        limit: Number(limit), sort, order
    }), [limit, sort, order])

    const advanced = useMemo(()=>({
            ...base,
            age_min: advancedFilters.ageRange[0],
            age_max: advancedFilters.ageRange[1],
            fame_min: advancedFilters.fameRange[0],
            fame_max: advancedFilters.fameRange[1],
            max_distance_km: advancedFilters.maxDistance?.[0],
            tag_ids: advancedFilters.tagIds,    
    }), [base, advancedFilters])

    const sentinelRef = useRef<HTMLDivElement>(null)

    const suggest = useSuggestedProfiles(base, !advancedSearch)
    const search = useSearchProfiles(advanced, advancedSearch)
    const {suggestedProfiles, serverError, isLoading, hasMore, loadMore} = advancedSearch ? search : suggest

    const loadMoreRef = useRef(loadMore)

    const {like, unlike, likeState, serverError: likeError} = useLikes()

    useEffect(()=>{
        const el = sentinelRef.current
        if (!el) return 
        const observer = new IntersectionObserver(
            (entires) => {
                if (entires[0].isIntersecting)
                    loadMoreRef.current()
            },
            { rootMargin: "200px" }
        )
        observer.observe(el)
        return ()=>observer.disconnect()
    }, [])

    const handleAdvancedSearch = ()=> {
        setAdvancedSearch(prev=>!prev)
    }

    return (
        <>
            <div className="flex flex-wrap gap-2">
                <SelectFilter
                    label="Limite"
                    items={limitList}
                    value={limit}
                    onChange={v=>setLimit(v ?? "20")}/>
                <SelectFilter
                    label="Sort by"
                    items={sortList}
                    value={sort}
                    onChange={v=>setSort(v as SortValue)}/>
                <SelectFilter
                    label="Order by"
                    items={orderList}
                    value={order}
                    onChange={v=>setOrder(v as OrderValue)}/>
                <Button variant={advancedSearch ? "default" : "secondary"} onClick={handleAdvancedSearch}>Advanced search</Button>
            </div>
            {advancedSearch && <AdvancedSearchForm value={advancedFilters} onChange={setAdvancedFilters} />}
            {serverError && <p className="p-1">{serverError}</p>}
            {likeError && <p className="p-1">{likeError}</p>}
            <div className="m-8 grid gap-8 justify-items-center
                grid-cols-[repeat(auto-fit,minmax(250px,1fr))]">
                {suggestedProfiles.map((p) => (
                    <div key={p.id}>
                        <ProfileCard profile={p} onLike={like} onUnlike={unlike} likeState={likeState} />
                    </div>
                ))}
            </div>
            <div ref={sentinelRef} />
            {isLoading && <p className="p-1">Loading...</p>}
            {!hasMore && !isLoading && <p className="p-1">No more profiles.</p>}
        </>
    )
}

export default SuggestPage