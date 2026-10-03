import { useInfiniteScroll } from "@/hooks/useInfiniteScroll"
import { useMemo, useState } from "react"
import { limitList } from "@/lib/pagination"
import { SelectFilter } from "@/components/selectFilter"
import useLikesReceived from "@/social/useLikesReceived"
import { Separator } from "@/components/ui/separator"
import { useNavigate } from "react-router-dom"

function LikesReceived() {
    const [limit, setLimit] = useState("20")
    const navigate = useNavigate()

    const filters = useMemo(()=>({
        limit: Number(limit)
    }), [limit])
    const {likesReceivedList, serverError, isLoading, hasMore, loadMore} = useLikesReceived(filters, true)
    
    const sentinelRef = useInfiniteScroll(loadMore)

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
                {likesReceivedList.map((like) => {
                    const rawDate = like.liked_at 
                                    ? (like.liked_at.endsWith('Z') ? like.liked_at : like.liked_at + 'Z') : null
                    const formattedDate = rawDate ? new Date(rawDate).toLocaleString('en-US', {
                        month: 'short',
                        day: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: true
                    }) : ''                
                    return (                   
                        <div key={like.id}>
                            <dl
                                className="flex flex-wrap gap-2 items-center justify-between"
                                onClick={()=>navigate(`/users/${like.id}`)}
                            >
                                <dt>{like.first_name} {like.last_name}</dt>
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
            {!hasMore && !isLoading && <p className="p-1">No more likes.</p>}
        </>
    )
}

export default LikesReceived