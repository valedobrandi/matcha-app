import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react"
import { Link, useParams } from "react-router-dom"
import { isSameDay, isToday, isYesterday } from "date-fns"
import { ArrowLeftIcon, MessageCircleIcon, SendHorizontalIcon } from "lucide-react"
import { API_BASE_URL } from "@/api/client"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { buttonVariants } from "@/components/ui/button"
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@/components/ui/empty"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupTextarea,
} from "@/components/ui/input-group"
import { Marker, MarkerContent } from "@/components/ui/marker"
import { Message, MessageContent, MessageFooter } from "@/components/ui/message"
import {
    MessageScroller,
    MessageScrollerButton,
    MessageScrollerContent,
    MessageScrollerItem,
    MessageScrollerProvider,
    MessageScrollerViewport,
    useMessageScroller,
    useMessageScrollerVisibility,
} from "@/components/ui/message-scroller"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { useConversation } from "@/chat/useConversation"
import { useMarkConversationRead } from "@/chat/useMarkConversationRead"
import { useSendMessage } from "@/chat/useSendMessage"
import type { MessageOut } from "@/types/chat"
import { usePublicProfile } from "@/users/usePublicProfile"

const MAX_MESSAGE_LENGTH = 2000

function dayLabel(date: Date) {
    if (isToday(date)) return "Today"
    if (isYesterday(date)) return "Yesterday"
    return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
}

export function ConversationPage() {
    const peerId = Number(useParams().peerId)
    return <Conversation key={peerId} peerId={peerId} />
}

function Conversation({ peerId }: { peerId: number }) {
    const { publicProfile, profileAvatar } = usePublicProfile(peerId)
    const { messages, isLoading, hasOlder, isLoadingOlder, canLoadOlder, loadOlder, serverError } = useConversation(peerId)
    const peerName = publicProfile ? `${publicProfile.first_name} ${publicProfile.last_name}` : null
    const showsConversation = !isLoading && (messages.length > 0 || serverError === null)

    return (
        <div className="mx-auto flex h-[calc(100svh-8rem)] min-h-96 w-full max-w-3xl flex-col overflow-hidden rounded-xl border">
            <div className="flex items-center gap-3 border-b p-3">
                <Link to="/chat" aria-label="Back to chat" className={buttonVariants({ variant: "ghost", size: "icon-sm" })}>
                    <ArrowLeftIcon />
                </Link>
                {publicProfile ? (
                    <>
                        <Avatar>
                            <AvatarImage src={profileAvatar ? `${API_BASE_URL}${profileAvatar}` : undefined} alt="" />
                            <AvatarFallback>{publicProfile.first_name[0]}{publicProfile.last_name[0]}</AvatarFallback>
                        </Avatar>
                        <h1 className="min-w-0 truncate font-medium">
                            <Link to={`/users/${peerId}`} className="hover:underline">{peerName}</Link>
                        </h1>
                    </>
                ) : (
                    <h1 className="font-medium">Conversation</h1>
                )}
            </div>

            {isLoading && (
                <div className="flex flex-1 flex-col justify-end gap-3 p-4" aria-busy="true">
                    <span className="sr-only">Loading messages</span>
                    <Skeleton className="h-9 w-48 rounded-xl" />
                    <Skeleton className="h-9 w-64 self-end rounded-xl" />
                    <Skeleton className="h-9 w-40 rounded-xl" />
                </div>
            )}

            {showsConversation && (
                <MessageScrollerProvider autoScroll scrollPreviousItemPeek={0}>
                    <MessageList
                        peerId={peerId}
                        peerFirstName={publicProfile?.first_name ?? null}
                        messages={messages}
                        hasOlder={hasOlder}
                        isLoadingOlder={isLoadingOlder}
                        canLoadOlder={canLoadOlder}
                        loadOlder={loadOlder}
                    />
                    <MessageComposer peerId={peerId} peerName={peerName} />
                </MessageScrollerProvider>
            )}

            {serverError && (
                <Alert variant="destructive" className="mx-3 my-3 w-auto">
                    <AlertDescription>{serverError}</AlertDescription>
                </Alert>
            )}
        </div>
    )
}

type MessageListProps = {
    peerId: number
    peerFirstName: string | null
    messages: MessageOut[]
    hasOlder: boolean
    isLoadingOlder: boolean
    canLoadOlder: boolean
    loadOlder: () => unknown
}

function MessageList({ peerId, peerFirstName, messages, hasOlder, isLoadingOlder, canLoadOlder, loadOlder }: MessageListProps) {
    const { visibleMessageIds } = useMessageScrollerVisibility()
    const markRead = useMarkConversationRead(peerId)
    const markedUpTo = useRef(0)
    const seenIds = new Set(visibleMessageIds.map(Number))
    const newestSeenFromPeer = messages.findLast(
        message => message.from_user_id === peerId && seenIds.has(message.id)
    )?.id ?? 0
    const isOldestSeen = messages.length > 0 && seenIds.has(messages[0].id)

    useEffect(() => {
        if (newestSeenFromPeer <= markedUpTo.current) return
        markedUpTo.current = newestSeenFromPeer
        markRead(newestSeenFromPeer)
    }, [newestSeenFromPeer, markRead])

    useEffect(() => {
        if (isOldestSeen && canLoadOlder) void loadOlder()
    }, [isOldestSeen, canLoadOlder, loadOlder])

    return (
        <MessageScroller className="flex-1">
            <MessageScrollerViewport>
                <MessageScrollerContent className="gap-3 p-4">
                    {messages.map((message, index) => {
                        const isMine = message.from_user_id !== peerId
                        const time = new Date(message.created_at)
                        const next = messages[index + 1]
                        const nextTime = next && new Date(next.created_at)
                        const opensHistory = index === 0 && !hasOlder
                        const closesDay = nextTime !== undefined && !isSameDay(time, nextTime)
                        return (
                            <MessageScrollerItem key={message.id} messageId={String(message.id)}>
                                {opensHistory && (
                                    <Marker variant="separator" className="pb-6">
                                        <MarkerContent>{dayLabel(time)}</MarkerContent>
                                    </Marker>
                                )}
                                <Message align={isMine ? "end" : "start"}>
                                    <MessageContent>
                                        <span className="sr-only">{isMine ? "Sent" : "Received"}</span>
                                        <Bubble variant={isMine ? "default" : "muted"} align={isMine ? "end" : "start"}>
                                            <BubbleContent className="whitespace-pre-wrap">{message.body}</BubbleContent>
                                        </Bubble>
                                        <MessageFooter>
                                            <time dateTime={time.toISOString()}>
                                                {time.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                                            </time>
                                        </MessageFooter>
                                    </MessageContent>
                                </Message>
                                {closesDay && (
                                    <Marker variant="separator" className="pt-6">
                                        <MarkerContent>{dayLabel(nextTime)}</MarkerContent>
                                    </Marker>
                                )}
                            </MessageScrollerItem>
                        )
                    })}
                </MessageScrollerContent>
            </MessageScrollerViewport>
            {messages.length === 0 && (
                <Empty className="absolute inset-0">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <MessageCircleIcon />
                        </EmptyMedia>
                        <EmptyTitle>No messages yet</EmptyTitle>
                        <EmptyDescription>
                            {peerFirstName ? `Say hello to ${peerFirstName}.` : "Say hello."}
                        </EmptyDescription>
                    </EmptyHeader>
                </Empty>
            )}
            {isLoadingOlder && <Spinner className="absolute inset-x-0 top-3 mx-auto" />}
            <MessageScrollerButton />
        </MessageScroller>
    )
}

function MessageComposer({ peerId, peerName }: { peerId: number, peerName: string | null }) {
    const [body, setBody] = useState("")
    const { send, isSending, serverError } = useSendMessage(peerId)
    const { scrollToEnd } = useMessageScroller()
    const text = body.trim()

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (text === "" || isSending) return
        if (await send(text)) {
            setBody(current => current.startsWith(body) ? current.slice(body.length) : current)
            scrollToEnd({ behavior: "smooth" })
        }
    }

    const sendOnEnter = (event: KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return
        event.preventDefault()
        event.currentTarget.form?.requestSubmit()
    }

    return (
        <form onSubmit={submit} className="border-t p-3">
            <Field data-invalid={serverError !== null}>
                <FieldLabel htmlFor="message-body" className="sr-only">
                    {peerName ? `Message ${peerName}` : "Message"}
                </FieldLabel>
                <InputGroup>
                    <InputGroupTextarea
                        id="message-body"
                        value={body}
                        onChange={event => setBody(event.target.value)}
                        onKeyDown={sendOnEnter}
                        placeholder="Write a message"
                        maxLength={MAX_MESSAGE_LENGTH}
                        rows={1}
                        aria-invalid={serverError !== null}
                        className="max-h-40 min-h-0"
                    />
                    <InputGroupAddon align="inline-end" className="self-end">
                        <InputGroupButton
                            type="submit"
                            variant="default"
                            size="icon-sm"
                            disabled={text === "" || isSending}
                            aria-label="Send message"
                        >
                            {isSending ? <Spinner /> : <SendHorizontalIcon />}
                        </InputGroupButton>
                    </InputGroupAddon>
                </InputGroup>
                {serverError && <FieldError>{serverError}</FieldError>}
            </Field>
        </form>
    )
}
