import {
    BellIcon,
    EyeIcon,
    HeartCrackIcon,
    HeartHandshakeIcon,
    HeartIcon,
    MessageCircleIcon,
    type LucideIcon,
} from "lucide-react"
import { Link } from "react-router-dom"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
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
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll"
import { useMarkNotificationsRead } from "@/notifications/useMarkNotificationsRead"
import { useNotifications } from "@/notifications/useNotifications"
import { useUnreadCount } from "@/notifications/useUnreadCount"
import type { NotificationOut } from "@/types/notifications"

const PAGE_SIZE = 20

const NOTIFICATION_KINDS: Record<NotificationOut["type"], { icon: LucideIcon, sentence: (name: string) => string }> = {
    liked: { icon: HeartIcon, sentence: name => `${name} liked you` },
    visited: { icon: EyeIcon, sentence: name => `${name} viewed your profile` },
    matched: { icon: HeartHandshakeIcon, sentence: name => `You and ${name} are now connected` },
    unliked: { icon: HeartCrackIcon, sentence: name => `${name} unliked you` },
    message: { icon: MessageCircleIcon, sentence: name => `${name} sent you a message` },
}

export function NotificationsPage() {
    const { notifications, serverError, isLoading, loadMore } = useNotifications(PAGE_SIZE)
    const unreadCount = useUnreadCount()
    const { markRead, markAllRead, isMarkingAll, serverError: markError } = useMarkNotificationsRead()
    const sentinelRef = useInfiniteScroll(loadMore)
    const error = serverError ?? markError

    return (
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
            <div className="flex items-center justify-between gap-4">
                <h1 className="text-xl font-semibold tracking-tight">Notifications</h1>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={markAllRead}
                    disabled={unreadCount === 0 || isMarkingAll}
                >
                    {isMarkingAll && <Spinner data-icon="inline-start" />}
                    Mark all as read
                </Button>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {isLoading && notifications.length === 0 && (
                <div className="flex flex-col gap-2.5" aria-busy="true">
                    <span className="sr-only">Loading notifications</span>
                    {[0, 1, 2].map(row => <Skeleton key={row} className="h-14 w-full rounded-lg" />)}
                </div>
            )}

            {!isLoading && !serverError && notifications.length === 0 && (
                <Empty className="border">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <BellIcon />
                        </EmptyMedia>
                        <EmptyTitle>No notifications yet</EmptyTitle>
                        <EmptyDescription>
                            Likes, profile views, new connections and messages show up here.
                        </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                        <Link to="/suggest" className={buttonVariants({ variant: "outline" })}>
                            Discover profiles
                        </Link>
                    </EmptyContent>
                </Empty>
            )}

            {notifications.length > 0 && (
                <ItemGroup>
                    {notifications.map(notification => {
                        const { icon: Icon, sentence } = NOTIFICATION_KINDS[notification.type]
                        const { actor } = notification
                        const isUnread = notification.read_at === null
                        const createdAt = notification.created_at.endsWith("Z")
                            ? notification.created_at
                            : `${notification.created_at}Z`
                        return (
                            <div role="listitem" key={notification.id}>
                                <Item
                                    size="sm"
                                    variant={isUnread ? "muted" : "default"}
                                    render={<Link to={`/users/${actor.id}`} />}
                                    onClick={() => {
                                        if (isUnread) markRead(notification.id)
                                    }}
                                >
                                    <ItemMedia variant="icon">
                                        <Icon />
                                    </ItemMedia>
                                    <ItemContent>
                                        <ItemTitle>{sentence(`${actor.first_name} ${actor.last_name}`)}</ItemTitle>
                                        <ItemDescription>
                                            <time dateTime={createdAt}>
                                                {new Date(createdAt).toLocaleString("en-US", {
                                                    month: "short",
                                                    day: "numeric",
                                                    hour: "numeric",
                                                    minute: "2-digit",
                                                })}
                                            </time>
                                        </ItemDescription>
                                    </ItemContent>
                                    {isUnread && (
                                        <ItemActions>
                                            <Badge>New</Badge>
                                        </ItemActions>
                                    )}
                                </Item>
                            </div>
                        )
                    })}
                </ItemGroup>
            )}

            <div ref={sentinelRef} />
            {isLoading && notifications.length > 0 && <Spinner className="mx-auto" />}
        </div>
    )
}
