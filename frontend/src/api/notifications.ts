import type { NotificationOkResponse, NotificationOut, UnreadCountOut } from "@/types/notifications";
import type { BasicQueryParamsValues } from "@/schemas/discovery";
import { apiGet, apiPost } from "./client";
import { toQueryString } from "./query";

export async function getNotifications(
    token: string,
    params: BasicQueryParamsValues
): Promise<NotificationOut[]> {
    return apiGet<NotificationOut[]>(`/notifications${toQueryString(params)}`, {token})
}

export async function getUnreadCount(token: string): Promise<UnreadCountOut> {
    return apiGet<UnreadCountOut>("/notifications/unread-count", {token})
}

export async function postMarkRead(
    token: string,
    notificationId: number
): Promise<NotificationOkResponse> {
    return apiPost<NotificationOkResponse>(`/notifications/${notificationId}/read`, undefined, {token})
}

export async function postMarkAllRead(token: string): Promise<NotificationOkResponse> {
    return apiPost<NotificationOkResponse>("/notifications/read-all", undefined, {token})
}
