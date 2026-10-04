import { useAuth } from "@/auth/useAuth"
import { useMutation } from "@tanstack/react-query"
import * as socialApi from "@/api/social"
import type { reportInputValue } from "@/schemas/social"
import { toServerMessage } from "@/hooks/toServerMessage"

export function useReport() {
    const { accessToken } = useAuth()
    const mutation = useMutation({
        mutationFn: async ({ targetId, payload }: { targetId: number, payload: reportInputValue }) => {
            const res = await socialApi.postReport(accessToken!, targetId, payload)
            if (!res.ok)
                throw Error("Report failed")
        },
    })
    const apiError = toServerMessage(mutation.error)
    const serverError = apiError ?? (mutation.error ? "Report failed, please try it later" : null)

    const report = async (targetId: number, payload: reportInputValue) => {
        if (!accessToken) return false
        return mutation.mutateAsync({ targetId, payload }).then(()=>true, ()=>false)
    }

    return { report, serverError }
}
