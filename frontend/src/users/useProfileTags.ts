import { ApiError } from "@/api/client"
import { getTags } from "@/api/tags"
import { deleteProfileTags, postProfileTags, getMyTags } from "@/api/users"
import { useAuth } from "@/auth/useAuth"
import { toServerMessage } from "@/hooks/useServerError"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"

function useProfileTags() {
    const { accessToken } = useAuth()
    const queryClient = useQueryClient()
    const [ inputValue, setInputValue ] = useState<string>("")
    const [ actionError, setActionError ] = useState<string | null>(null)

    const myTags = useQuery({
        queryKey: ["my-tags", accessToken],
        queryFn: () => getMyTags(accessToken!),
        enabled: !!accessToken,
    })
    const invalidateMyTags = () => queryClient.invalidateQueries({ queryKey: ["my-tags"] })

    const search = useMutation({
        mutationFn: (value: string) => getTags(accessToken!, value),
        onError: (err) => {
            setActionError(toServerMessage(err))
            if (err instanceof ApiError && err.code == "TAG_CONTENT_PROFANITY")
                setInputValue("")
        },
    })
    const add = useMutation({
        mutationFn: (name: string) => postProfileTags(accessToken!, {name}),
        onSuccess: () => {
            search.reset()
            return invalidateMyTags()
        },
        onError: (err) => setActionError(toServerMessage(err)),
        onSettled: () => setInputValue(""),
    })
    const remove = useMutation({
        mutationFn: (tag_id: number) => deleteProfileTags(accessToken!, tag_id),
        onSuccess: invalidateMyTags,
        onError: (err) => setActionError(toServerMessage(err)),
    })

    const tagsList = myTags.data ?? []

    const handleInput = (value: string) => {
        setActionError(null)
        setInputValue(value)
        search.mutate(value)
    }

    const handleAddTag = (tag_name: string) => {
        if (!tag_name)
            return
        const trimTag = tag_name.trim()
        if (trimTag.length == 0)
            return
        if (tagsList.find(t=>t.name.toLowerCase() === trimTag.toLowerCase())) {
            setActionError("You have already added the same tag")
            return
        }
        setActionError(null)
        add.mutate(trimTag)
    }

    const handleDeleteTag = (tag_id: number) => {
        setActionError(null)
        remove.mutate(tag_id)
    }

    return {
        inputValue,
        tagsSearchList: search.data ?? [],
        tagsList,
        serverError: actionError ?? toServerMessage(myTags.error),
        handleInput,
        handleAddTag,
        handleDeleteTag,
    }
}

export default useProfileTags
