import type {
    ChatOkResponse,
    MessageOut,
    MessagesQuery,
    ReadConversationInput,
    SendMessageInput,
} from "@/types/chat"
import { apiGet, apiPost } from "./client"
import { toQueryString } from "./query"

export async function getMessages(
    token: string,
    peerId: number,
    params: MessagesQuery
): Promise<MessageOut[]> {
    return apiGet<MessageOut[]>(`/chat/messages/${peerId}${toQueryString(params)}`, {token})
}

export async function postMessage(
    token: string,
    peerId: number,
    payload: SendMessageInput
): Promise<MessageOut> {
    return apiPost<MessageOut>(`/chat/messages/${peerId}`, payload, {token})
}

export async function postConversationRead(
    token: string,
    peerId: number,
    payload: ReadConversationInput
): Promise<ChatOkResponse> {
    return apiPost<ChatOkResponse>(`/chat/conversations/${peerId}/read`, payload, {token})
}
