import { useInfiniteScroll } from "@/hooks/useInfiniteScroll"
import { SelectFilter } from "@/components/selectFilter"
import useVisitors from "@/social/useVisitors"
import { useMemo, useState } from "react"
import { limitList } from "@/lib/pagination"
import { Separator } from "@/components/ui/separator"
import { useNavigate } from "react-router-dom"

function Visitors() {
    const [limit, setLimit] = useState("20")
    const navigate = useNavigate()
    
    const filter = useMemo(()=>({
        limit: Number(limit)
    }), [limit])

    const {visitorsList, serverError, isLoading, hasMore, loadMore} = useVisitors(filter, true)

    const sentinelRef = useInfiniteScroll(loadMore, isLoading)

    return (
        <>
            <div className="flex flex-wrap gap-2">
                <SelectFilter
                    label="Limite"
                    items={limitList}
                    value={limit}
                    onChange={v=>setLimit(v ?? "20")}/> 
            </div>
            {serverError && <p className="p-1">{serverError}</p>}
            <div className="m-8 grid gap-8 justify-items-center
                grid-cols-[repeat(auto-fit,minmax(250px,1fr))]">
                <div className="flex w-full flex-col gap-2 text-sm">
                {visitorsList.map((visitor) => {
                    const formattedDate = new Date(visitor.visited_at).toLocaleString('en-US', {
                        month: 'short',
                        day: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: true
                    })
                    return (                   
                        <div key={visitor.id}>
                            <dl
                                className="flex flex-wrap gap-2 items-center justify-between"
                                onClick={()=>navigate(`/users/${visitor.id}`)}
                            >
                                <dt>{visitor.first_name} {visitor.last_name}</dt>
                                <dd className="text-muted-foreground">liked at {formattedDate}</dd>
                            </dl>
                            <Separator />
                    </div>
                    )
                })}
                </div>
            </div>
            <div ref={sentinelRef} />
            {isLoading && <p className="p-1">Loading...</p>}
            {!hasMore && !isLoading && <p className="p-1">No more visitors.</p>}
        </>
    )
}

export default Visitors