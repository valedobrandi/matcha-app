import type { components, operations } from "./api"

export type MessageOut = components["schemas"]["MessageOut"]
export type SendMessageInput = components["schemas"]["SendMessageInput"]
export type ReadConversationInput = components["schemas"]["ReadConversationInput"]
export type ChatOkResponse = components["schemas"]["ChatOkResponse"]
export type MessagesQuery = NonNullable<operations["list_messages_chat_messages__peer_id__get"]["parameters"]["query"]>
