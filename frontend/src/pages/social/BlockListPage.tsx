import { useInfiniteScroll } from "@/hooks/useInfiniteScroll"
import { SelectFilter } from "@/components/selectFilter"
import { useMemo, useState } from "react"
import { limitList } from "@/lib/pagination"
import { Separator } from "@/components/ui/separator"
import { useBlockList } from "@/social/useBlockList"
import { Button } from "@/components/ui/button"
import { useBlock } from "@/social/useBlock"

export function BlockListPage() {
    const [limit, setLimit] = useState("20")
    const filter = useMemo(()=>({
        limit: Number(limit)
    }),[limit])
    const { blockList, serverError, isLoading, hasMore, loadMore} = useBlockList(filter, true)
    const {unblock, serverError: blockError} = useBlock()
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
            {blockError && <p className="p-1">{blockError}</p>}
            <div className="m-8 grid gap-8 justify-items-center
                grid-cols-[repeat(auto-fit,minmax(250px,1fr))]">
                <div className="flex w-full flex-col gap-2 text-sm">
                {blockList.map((block) => {
                    const rawDate = block.blocked_at
                                    ? (block.blocked_at.endsWith('Z') ? block.blocked_at : block.blocked_at + 'Z') : null
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
                        <div key={block.id}>
                            <dl
                                className="flex flex-wrap gap-2 items-center justify-between">
                                <dt>{block.first_name} {block.last_name}</dt>
                                <dd className="text-muted-foreground">Blocked at {formattedDate}</dd>
                                <Button variant="ghost" onClick={()=>unblock(block.id)}>Unblock</Button>
                            </dl>
                            <Separator />
                    </div>
                    )
                })}
                </div>
            </div>
            <div ref={sentinelRef} />
            {isLoading && <p className="p-1">Loading...</p>}
            {!hasMore && !isLoading && <p className="p-1">End of list.</p>}
        </>
    )
}