import { useAuth } from "@/auth/useAuth";
import * as socialApi from "@/api/social"
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type LikeStateResponse } from "@/types/social";
import { toServerMessage } from "@/hooks/toServerMessage";
import { invalidateLikeViews } from "./queryKeys";

type LikeAction = { targetId: number, liked: boolean }

export function useLikes() {
    const { accessToken } = useAuth()
    const queryClient = useQueryClient()
    const [ likeState, setLikeState ] = useState< Record<number, LikeStateResponse> | null>(null)

    const mutation = useMutation({
        mutationFn: ({ targetId, liked }: LikeAction) => liked
            ? socialApi.postLike(accessToken!, targetId)
            : socialApi.postUnLike(accessToken!, targetId),
        onSuccess: async (state, { targetId }) => {
            setLikeState(prev=>({...prev, [targetId]: state}))
            await invalidateLikeViews(queryClient)
        },
    })
    const serverError = toServerMessage(mutation.error)

    const send = async (action: LikeAction) => {
        if (!accessToken) return
        return mutation.mutateAsync(action).then(()=>true, ()=>false)
    }

    return {
        like: (targetId: number) => send({ targetId, liked: true }),
        unlike: (targetId: number) => send({ targetId, liked: false }),
        likeState,
        serverError,
    }
}
