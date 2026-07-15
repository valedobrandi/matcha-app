import { apiGet, apiPost, apiPatch, apiDelete } from "./client"
import type { UserProfile, Tag, TagInput } from "../types/user"
import type { ProfileValues } from "@/schemas/users"

export async function getUserProfile(token: string): Promise<UserProfile> {
    return apiGet<UserProfile>("/users/me", {token})
}

export async function updateUserProfile(token: string, body: ProfileValues): Promise<UserProfile> {
    return apiPatch<UserProfile>("/users/me", body, {token})
}

export async function getMyTags(token: string): Promise<Tag[]> {
    return apiGet<Tag[]>("/users/me/tags", {token})
}

export async function postProfileTags(token: string, tag_input: TagInput): Promise<Tag> {
    return apiPost<Tag>("/users/me/tags", tag_input, {token})
}

export async function deleteProfileTags(token: string, tag_id: number): Promise<void> {
    return apiDelete<void>(`/users/me/tags/${tag_id}`, {token})
}