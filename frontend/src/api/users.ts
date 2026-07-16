import {
    apiGet,
    apiPost,
    apiPatch,
    apiDelete,
    apiPostFormData,
} from "./client"
import type { UserProfile, Tag, TagInput, Photo } from "../types/user"
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

export async function postProfilePhoto(token: string, photo_input: File): Promise<Photo> {
    const formData = new FormData()
    formData.append("file", photo_input)
    return apiPostFormData<Photo>("/users/me/photos", formData, {token})
}

export async function getMyPhotos(token: string): Promise<Photo[]> {
    return apiGet<Photo[]>("/users/me/photos", {token})
}

export async function deleteProfilePhoto(token: string, photo_id: number): Promise<void> {
    return apiDelete<void>(`/users/me/photos/${photo_id}`, {token})
}