import { useEffect, useRef } from "react"

// Calls the latest loadMore when the returned sentinel scrolls near the viewport.
export function useInfiniteScroll(loadMore: () => void) {
    const sentinelRef = useRef<HTMLDivElement>(null)
    const loadMoreRef = useRef(loadMore)

    useEffect(()=>{
        loadMoreRef.current = loadMore
    }, [loadMore])

    useEffect(()=>{
        const el = sentinelRef.current
        if (!el) return
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting)
                    loadMoreRef.current()
            },
            { rootMargin: "200px" }
        )
        observer.observe(el)
        return ()=>observer.disconnect()
    }, [])

    return sentinelRef
}
