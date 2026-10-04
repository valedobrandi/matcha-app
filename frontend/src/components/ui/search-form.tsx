import { Label } from "@/components/ui/label"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarInput,
} from "@/components/ui/sidebar"
import { SearchIcon } from "lucide-react"
import { useEffect, useRef, useState } from 'react'
import * as discoveryApi from '@/api/discovery'
import { useAuth } from "@/auth/useAuth"
import { ApiError } from "@/api/client"
import { resolveErrorMessage } from "@/i18n/errors"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import type { SearchingBarProfile } from "@/types/discovery"
import { useNavigate } from "react-router-dom"

export function SearchForm({ ...props }: React.ComponentProps<"form">) {
  const { accessToken } = useAuth()
  const [inputValue, setInputValue] = useState<string>("")
  const [seachingBarProfileList, setSeachingBarProfileList] = useState<SearchingBarProfile[]>([])
  const [serverError, setServerError] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const requestIdRef = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(()=>{
    if (!accessToken) return
    setServerError(null)
    const trimmed = inputValue.trim()
    if (trimmed.length < 2) {
      setInputValue("")
      setSeachingBarProfileList([])
      setIsOpen(false)
      return
    }
    setIsLoading(true)
    const currentRequestId = ++requestIdRef.current
    const timer = setTimeout(async ()=>{
      try {
        const result = await discoveryApi.getSeachingBarProfiles(accessToken, trimmed)
        if (currentRequestId === requestIdRef.current) {
          setSeachingBarProfileList(result)
          setIsOpen(true)
        }
      } catch (err) {
        if (err instanceof ApiError) {
          setServerError(resolveErrorMessage(err.code, err.message))
          setSeachingBarProfileList([])
        }
      } finally {
        if (currentRequestId === requestIdRef.current) {
          setIsLoading(false)
        }
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [accessToken, inputValue])

  useEffect(()=>{
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return ()=>document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleLinkPublicProfile = (id: number) => {
    setServerError(null)
    setIsLoading(false)
    setInputValue("")
    setSeachingBarProfileList([])
    setIsOpen(false)
    navigate(`/users/${id}`)
  }

  return (
    <form {...props} onSubmit={(e) => e.preventDefault()}>
      <SidebarGroup className="py-0" ref={containerRef}>
        <div className="relative">
          <SidebarGroupContent>
            <Label htmlFor="search" className="sr-only">
              Search
            </Label>
            <SidebarInput
              id="search"
              placeholder="Searching for the one..."
              className="pl-8 pr-20"
              value={inputValue ?? ""}
              onChange={e=>setInputValue(e.target.value)}
            />
            {isOpen && seachingBarProfileList.length > 0 && (
              <ScrollArea className="absolute top-20 left-0 mt-2 z-50 h-62 rounded-md border bg-white">
                <div className="p-4">
                  <h4 className="mb-4 text-sm leading-none font-medium">Search results</h4>
                  {seachingBarProfileList.map((profile) => (
                    <div key={profile.id}>
                      <div className="text-sm" onClick={()=>handleLinkPublicProfile(profile.id)}>{profile.first_name} {profile.last_name} ({profile.username})</div>
                      <Separator className="my-2" />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
            {isOpen && !isLoading && seachingBarProfileList.length === 0 && (
              <ScrollArea className="absolute top-20 left-0 mt-2 z-50 h-62 rounded-md border bg-white">
                <div className="p-4">
                  <h4 className="mb-4 text-sm leading-none font-medium">Search results</h4>
                    <div>
                      <div className="text-sm">{serverError ? serverError : "User is not exists."}</div>
                    </div>
                </div>
              </ScrollArea>
            )}
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 opacity-50 select-none" />
          </SidebarGroupContent>
        </div>
      </SidebarGroup>
    </form>
  )
}
