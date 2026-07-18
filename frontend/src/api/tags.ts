import type { Tag } from "@/types/user";
import { apiGet } from "./client";

export async function getTags(token: string, tag_content: string): Promise<Tag[]> {
    return apiGet<Tag[]>(`/tags?search=${tag_content}`, {token})
}