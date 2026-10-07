import * as React from "react"
import { Link, useLocation } from "react-router-dom"
import { Badge } from "@/components/ui/badge"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { useUnreadCount } from "@/notifications/useUnreadCount"

// This is sample data.
const data = {
  navMain: [
    {
      title: "Discovery",
      url: "/suggest",
    },
    {
      title: "Likes",
      url: "/likes",
    },
    {
      title: "Visitors",
      url: "/visitors",
    },
    {
      title: "Chat",
      url: "/chat",
    },
    {
      title: "Me",
      url: "/profile",
    }
  ]
}
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { pathname } = useLocation()
  const { unreadMessages } = useUnreadCount()
  return (
    <Sidebar {...props}>
      <SidebarHeader>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {data.navMain.map((item) => {
                const showsNewMessages = item.url === "/chat" && unreadMessages > 0
                return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    isActive={pathname === item.url || pathname.startsWith(`${item.url}/`)}
                    render={<Link to={item.url} />}
                    aria-label={showsNewMessages ? `${item.title}, new messages` : undefined}
                  >
                    {item.title}
                  </SidebarMenuButton>
                  {showsNewMessages && (
                    <SidebarMenuBadge aria-hidden>
                      <Badge className="size-2 p-0" />
                    </SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
                )
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
