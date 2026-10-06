import { BellIcon } from "lucide-react"
import { Link } from "react-router-dom"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useUnreadCount } from "@/notifications/useUnreadCount"

const MAX_SHOWN_COUNT = 99

export function NotificationBell() {
    const unreadCount = useUnreadCount()
    const label = unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"

    return (
        <Link
            to="/notifications"
            aria-label={label}
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "relative")}
        >
            <BellIcon />
            {unreadCount > 0 && (
                <Badge aria-hidden className="absolute -top-1 -right-1 h-4 min-w-4 px-1 tabular-nums">
                    {unreadCount > MAX_SHOWN_COUNT ? `${MAX_SHOWN_COUNT}+` : unreadCount}
                </Badge>
            )}
        </Link>
    )
}
