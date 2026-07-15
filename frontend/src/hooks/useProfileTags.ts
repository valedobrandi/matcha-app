import { ApiError } from "@/api/client"
import { getTags } from "@/api/tags"
import { deleteProfileTags, postProfileTags, getMyTags } from "@/api/users"
import { useAuth } from "@/auth/useAuth"
import type { Tag } from "@/types/user"
import { useCallback, useEffect, useState } from "react"

function useProfileTags() {
    const { accessToken } = useAuth()
    const [ inputValue, setInputValue ] = useState<string>("")
    const [ tagsSearchList, setTagsSearchList] = useState<Tag[]>([])
    const [ tagsList, setTagsList ] = useState<Tag[]>([])
    const [ serverError, setServerError ] = useState<string | null>(null)

    const handleMyTags = useCallback(async () => {
        try {
            const myTags = await getMyTags(accessToken!)
            setTagsList(myTags)
        } catch (err) {
            if (err instanceof ApiError)
                setServerError(err.message)           
        }

    }, [accessToken])

    useEffect(()=>{
        void handleMyTags()
    }, [handleMyTags])

    const handleInput = async (value: string) => {
        setInputValue(value)
        try {
           const searchRes = await getTags(accessToken!, value)
           setTagsSearchList(searchRes)
        } catch (err) {
            if (err instanceof ApiError)
                setServerError(err.message)
        }
    }

    const handleAddTag = async (tag_name: string) => {
        try {
            const newTag: Tag = await postProfileTags(accessToken!, {name: tag_name})
            setTagsList(prev=>([
                ...prev,
                newTag
            ]))
            setTagsSearchList([])
        } catch (err) {
            if (err instanceof ApiError)
                setServerError(err.message)
        } finally {
            setInputValue("")
        }
    }

    const handleDeleteTag = async (tag_id: number) => {
        try {
            await deleteProfileTags(accessToken!, tag_id)
            setTagsList(prev=>prev.filter((t)=>t.id !== tag_id))
        }catch (err) {
            if (err instanceof ApiError)
                setServerError(err.message)
        }
    }

    return {
        inputValue,
        tagsSearchList,
        tagsList,
        serverError,
        handleMyTags,
        handleInput,
        handleAddTag,
        handleDeleteTag,
    }
}

export default useProfileTags