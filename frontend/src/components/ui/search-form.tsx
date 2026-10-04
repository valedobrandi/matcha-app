import { Label } from "@/components/ui/label"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarInput,
} from "@/components/ui/sidebar"
import { SearchIcon } from "lucide-react"
import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import * as discoveryApi from '@/api/discovery'
import { useAuth } from "@/auth/useAuth"
import { toServerMessage } from "@/hooks/toServerMessage"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { useNavigate } from "react-router-dom"

const MIN_TERM_LENGTH = 2
const DEBOUNCE_MS = 300

export function SearchForm({ ...props }: React.ComponentProps<"form">) {
  const { accessToken } = useAuth()
  const [inputValue, setInputValue] = useState<string>("")
  const [debouncedTerm, setDebouncedTerm] = useState<string>("")
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const term = inputValue.trim()
  const canSearch = !!accessToken && debouncedTerm.length >= MIN_TERM_LENGTH
  const { data, error, isFetching } = useQuery({
    queryKey: ['search-list', debouncedTerm],
    queryFn: () => discoveryApi.getSeachingBarProfiles(accessToken!, debouncedTerm),
    enabled: canSearch,
  })
  const profiles = canSearch ? (data ?? []) : []
  const serverError = canSearch ? toServerMessage(error) : null
  const isSearching = term.length >= MIN_TERM_LENGTH && (term !== debouncedTerm || isFetching)
  const showPanel = isOpen && term.length >= MIN_TERM_LENGTH

  useEffect(()=>{
    const timer = setTimeout(() => setDebouncedTerm(term), DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [term])

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
    setInputValue("")
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
              onChange={e=>{
                setInputValue(e.target.value)
                setIsOpen(true)
              }}
            />
            {showPanel && profiles.length > 0 && (
              <ScrollArea className="absolute top-20 left-0 mt-2 z-50 h-62 rounded-md border bg-white">
                <div className="p-4">
                  <h4 className="mb-4 text-sm leading-none font-medium">Search results</h4>
                  {profiles.map((profile) => (
                    <div key={profile.id}>
                      <div className="text-sm" onClick={()=>handleLinkPublicProfile(profile.id)}>{profile.first_name} {profile.last_name} ({profile.username})</div>
                      <Separator className="my-2" />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
            {showPanel && !isSearching && profiles.length === 0 && (
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
