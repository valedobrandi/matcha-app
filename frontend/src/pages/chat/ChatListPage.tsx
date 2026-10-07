import { ChevronRightIcon, MessageCircleIcon } from "lucide-react"
import { Link } from "react-router-dom"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { buttonVariants } from "@/components/ui/button"
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@/components/ui/empty"
import {
    Item,
    ItemActions,
    ItemContent,
    ItemDescription,
    ItemGroup,
    ItemMedia,
    ItemTitle,
} from "@/components/ui/item"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { useConnections } from "@/chat/useConnections"
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll"

const PAGE_SIZE = 20

export function ChatListPage() {
    const { connections, serverError, isLoading, hasMore, loadMore } = useConnections(PAGE_SIZE)
    const sentinelRef = useInfiniteScroll(loadMore, isLoading)

    return (
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
            <h1 className="text-xl font-semibold tracking-tight">Chat</h1>

            {serverError && (
                <Alert variant="destructive">
                    <AlertDescription>{serverError}</AlertDescription>
                </Alert>
            )}

            {connections.length === 0 && hasMore && !serverError && (
                <div className="flex flex-col gap-2.5" aria-busy="true">
                    <span className="sr-only">Loading your connections</span>
                    {[0, 1, 2].map(row => <Skeleton key={row} className="h-14 w-full rounded-lg" />)}
                </div>
            )}

            {connections.length === 0 && !hasMore && (
                <Empty className="border">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <MessageCircleIcon />
                        </EmptyMedia>
                        <EmptyTitle>No connections yet</EmptyTitle>
                        <EmptyDescription>
                            When you and someone like each other, you can chat with them here.
                        </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                        <Link to="/suggest" className={buttonVariants({ variant: "outline" })}>
                            Discover profiles
                        </Link>
                    </EmptyContent>
                </Empty>
            )}

            {connections.length > 0 && (
                <ItemGroup>
                    {connections.map(connection => (
                        <div role="listitem" key={connection.id}>
                            <Item variant="outline" render={<Link to={`/chat/${connection.id}`} />}>
                                <ItemMedia>
                                    <Avatar>
                                        <AvatarFallback>
                                            {connection.first_name[0]}{connection.last_name[0]}
                                        </AvatarFallback>
                                    </Avatar>
                                </ItemMedia>
                                <ItemContent>
                                    <ItemTitle>{connection.first_name} {connection.last_name}</ItemTitle>
                                    <ItemDescription>@{connection.username}</ItemDescription>
                                </ItemContent>
                                <ItemActions>
                                    <ChevronRightIcon className="size-4" />
                                </ItemActions>
                            </Item>
                        </div>
                    ))}
                </ItemGroup>
            )}

            <div ref={sentinelRef} />
            {isLoading && connections.length > 0 && <Spinner className="mx-auto" />}
        </div>
    )
}
