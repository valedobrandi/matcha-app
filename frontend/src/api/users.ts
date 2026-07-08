import { apiGet } from "./client"
import type { UserProfile } from "../types/user"

export async function getMe(token: string): Promise<UserProfile> {
    return apiGet<UserProfile>("/users/me", {token})
}