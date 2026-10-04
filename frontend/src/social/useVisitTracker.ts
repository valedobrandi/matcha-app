import { useAuth } from "@/auth/useAuth"
import { useEffect, useRef } from "react"
import { useMutation } from "@tanstack/react-query"
import * as socialApi from "@/api/social"
import { useServerError } from "@/hooks/useServerError"

export function useVisitTracker(targetId: number | null) {
    const { accessToken }  = useAuth()
    const visitedRef = useRef<number | null>(null)

    const { mutate, error } = useMutation({
        mutationFn: async (id: number) => {
            const res = await socialApi.postVisit(accessToken!, id)
            if (!res.ok)
                throw Error("Post visit failed")
        },
        onError: () => {
            visitedRef.current = null
        },
    })
    const apiError = useServerError(error)
    const visitError = apiError ?? (error ? "Could not record the visit, please try it later" : null)

    useEffect(()=>{
        if (!targetId || !accessToken) return
        if (visitedRef.current === Number(targetId)) return
        visitedRef.current = targetId
        mutate(targetId)
    }, [targetId, accessToken, mutate])

    return {visitError}
}
