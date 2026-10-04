import { useAuth } from "@/auth/useAuth";
import * as socialApi from "@/api/social"
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toServerMessage } from "@/hooks/toServerMessage";

type BlockAction = { targetId: number, blocked: boolean }

export function useBlock() {
    const { accessToken } = useAuth()
    const queryClient = useQueryClient()

    const mutation = useMutation({
        mutationFn: ({ targetId, blocked }: BlockAction) => blocked
            ? socialApi.postBlock(accessToken!, targetId)
            : socialApi.deleteBlock(accessToken!, targetId),
        onSuccess: () => Promise.all(
            ["relationship", "public-profile", "blocks", "suggested-profiles", "search-profiles"].map(
                queryKey => queryClient.invalidateQueries({ queryKey: [queryKey] })
            )
        ),
    })
    const serverError = toServerMessage(mutation.error)

    const send = async (action: BlockAction) => {
        if (!accessToken) return
        return mutation.mutateAsync(action).then(()=>true, ()=>false)
    }

    return {
        block: (targetId: number) => send({ targetId, blocked: true }),
        unblock: (targetId: number) => send({ targetId, blocked: false }),
        blockState: mutation.data ?? null,
        serverError,
    }
}
