import { ApiError } from "@/api/client"
import { useAuth } from "@/auth/useAuth"
import { resolveErrorMessage } from "@/i18n/errors"
import { useCallback, useEffect, useRef, useState } from "react"

type UsePaginationOptions<TFilters, TData> = {
    filters: TFilters,
    enabled?: boolean,
    fetchPage: (accessToken: string, params: TFilters & {offset: number}) => Promise<TData[]>
}

export function usePagination<TFilters extends {limit: number}, TData>({
    filters,
    enabled = true,
    fetchPage
} : UsePaginationOptions<TFilters, TData>) {
    const { accessToken, logout } = useAuth()
    const [ isLoading, setIsLoading ] = useState(false)
    const [ hasMore, setHasMore ] = useState(true)
    const [ serverError, setServerError ] = useState<string | null>(null)
    const [ data, setData ] = useState<TData[]>([])
    
    const offsetRef = useRef(0)
    // Bumped by every first-page request (new filters). A response from an older
    // generation is stale and must not touch state.
    const generationRef = useRef(0)
    const isFetchingRef = useRef(false)

    const getPage = useCallback(
        async (offset: number, replace: boolean)=>{
            if (!accessToken || !enabled) return
            if (replace)
                generationRef.current += 1
            else if (isFetchingRef.current)
                return
            const generation = generationRef.current
            isFetchingRef.current = true
            setServerError(null)
            setIsLoading(true)
            try {
                const page = await fetchPage(accessToken, {...filters, offset})
                if (generation !== generationRef.current) return
                setData(prev=>replace ? page : [...prev, ...page])
                setHasMore(page.length === filters.limit)
                offsetRef.current = offset
            } catch (err) {
                if (generation !== generationRef.current) return
                if (err instanceof ApiError) {
                    setServerError(resolveErrorMessage(err.code, err.message))
                    if (err.code == "USER_NOT_FOUND")
                        logout()
                }
            } finally {
                if (generation === generationRef.current) {
                    isFetchingRef.current = false
                    setIsLoading(false)
                }
            }
    }, [accessToken, logout, filters, enabled, fetchPage])

    useEffect(()=>{
        if (!enabled) return
        offsetRef.current = 0
        getPage(0, true)
    }, [accessToken, enabled, filters, getPage])

    const loadMore = useCallback(()=>{
        if (!enabled) return
        if (!hasMore) return
        getPage(offsetRef.current + filters.limit, false)
    }, [getPage, hasMore, filters.limit, enabled])

    return {data, serverError, isLoading, hasMore, loadMore}
}
