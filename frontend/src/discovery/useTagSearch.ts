import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { ApiError } from "@/api/client"
import { getTags } from "@/api/tags"
import { useAuth } from "@/auth/useAuth"
import { toServerMessage } from "@/hooks/toServerMessage"

export function useTagSearch() {
    const { accessToken } = useAuth()
    const [inputValue, setInputValue] = useState("")
    const search = useMutation({
        mutationFn: (value: string) => getTags(accessToken!, value),
        onError: (err) => {
            if (err instanceof ApiError && err.code == "TAG_CONTENT_PROFANITY")
                setInputValue("")
        },
    })

    const handleInput = (value: string) => {
        setInputValue(value)
        search.mutate(value)
    }

    return {
        inputValue,
        tagsSearchList: search.data ?? [],
        serverError: toServerMessage(search.error),
        handleInput,
    }
}
