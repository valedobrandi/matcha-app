import { apiGet, apiPatch } from "./client"
import type { UserProfile } from "../types/user"
import type { ProfileValues } from "@/schemas/users"

export async function getUserProfile(token: string): Promise<UserProfile> {
    return apiGet<UserProfile>("/users/me", {token})
}

export async function updateUserProfile(token: string, body: ProfileValues): Promise<UserProfile> {
    return apiPatch<UserProfile>("/users/me", body, {token})
}