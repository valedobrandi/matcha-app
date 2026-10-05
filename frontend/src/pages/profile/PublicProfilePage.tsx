import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { FieldError, Field, FieldLabel, FieldGroup } from "@/components/ui/field"
import { usePublicProfile } from "@/users/usePublicProfile"
import { useParams } from "react-router-dom"
import likes from "@/assets/likes.png"
import vues from "@/assets/vues.png"
import { API_BASE_URL } from "@/api/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useLikes } from "@/social/useLikes"
import { useBlock } from "@/social/useBlock"
import { useState } from "react"
import type { reportInputValue } from "@/schemas/social"
import { useReport } from "@/social/useReport"
import { useVisitTracker } from "@/social/useVisitTracker"

function PublicProfilePage() {
    const { userId } = useParams()
    const {relationship, publicProfile, profileAvatar, isLoading, serverError} = usePublicProfile(Number(userId))
    // A visit is recorded only once the profile is actually shown (subject IV.5).
    const { visitError } = useVisitTracker(publicProfile?.id ?? null)
    const {like, unlike, serverError: likeError} = useLikes()
    const {block, unblock, serverError: blockError} = useBlock()
    const [reportValue, setReportValue] = useState<reportInputValue | null>(null)
    const {report, serverError: reportError} = useReport()

    const handleLike = async (targetId: number) => {
        if (relationship?.liked_by_me || relationship?.connected)
            await unlike(targetId)
        else
            await like(targetId)
    }

    const handleSubmitReport = async (targetId: number, payload: reportInputValue | null) => {
        if (!payload) return
        if (await report(targetId, payload))
            setReportValue(null)
    }

    return (
        <>
            {isLoading && <p>Loading...</p>}
            {serverError && <FieldError className="p-1 m-auto">{serverError}</FieldError>}
            {relationship?.blocked_by_me && (
                <div className="flex flex-col items-center gap-2">
                    <p>You blocked this user.</p>
                    <Button
                        variant="outline"
                        className="cursor-pointer"
                        onClick={()=>unblock(Number(userId))}
                    >
                        Unblock
                    </Button>
                    {blockError && <p className="p-1 m-auto">{blockError}</p>}
                </div>
            )}
            {publicProfile && (
                <div className="max-w-2xl mx-auto">
                    <div>
                        <Avatar className="w-16 h-16 mx-auto">
                            <AvatarImage src={profileAvatar ? `${API_BASE_URL}${profileAvatar!}` : undefined} alt={publicProfile?.username} />
                            <AvatarFallback>CN</AvatarFallback>
                            <AvatarBadge className="bg-green-600 dark:bg-green-800" />
                        </Avatar>
                    </div>
                    <div className="flex flex-col">
                        <h1 className="m-auto">{publicProfile.first_name} {publicProfile.last_name}</h1>
                        <div className="flex flex-row justify-center gap-3">
                            <div className="flex flex-row items-center gap-1">
                                <p>{publicProfile.likes_received_count ?? 0}</p>
                                <img src={likes} alt="likes" className="w-5 h-5 object-cover rounded cursor-pointer"/>
                            </div>
                            <div className="flex flex-row items-center gap-1">
                                <p>{publicProfile.visitors_count ?? 0}</p>
                                <img src={vues} alt="vues" className="w-5 h-5 object-cover rounded cursor-pointer"/>
                            </div>
                        </div>
                        <div className="flex flex-row justify-center gap-3">
                            <div className="flex flex-row items-center gap-1">
                                <p>{publicProfile.fame_rating}</p>
                                <p>Popularity</p>
                            </div>
                        </div>
                        <div className="flex gap-1 justify-center">
                            <Button
                                variant="outline"
                                className="max-inline-32 cursor-pointer"
                                onClick={()=>handleLike(publicProfile.id)}
                            >
                                {relationship?.connected? "Connected"
                                    : (relationship?.liked_by_me? "Liked by me"
                                    : (relationship?.liked_you? "Liked you and feedback like"
                                    : `Like ${publicProfile.gender === "male" ? "him" : "her"}`))}
                            </Button>
                            <Button
                                variant="outline"
                                className="max-inline-32 cursor-pointer"
                                onClick={()=>block(publicProfile.id)}
                            >
                                {`Block ${publicProfile.gender === "male" ? "him" : "her"}`}
                            </Button>
                            <DropdownMenu>
                                <DropdownMenuTrigger
                                    render={<Button variant="outline" className="cursor-pointer">...</Button>} />
                                <DropdownMenuContent>
                                  <DropdownMenuGroup>
                                        <Dialog>
                                            <form>
                                              <DialogTrigger render={<button className="text-sm inline-h">Report</button>} />
                                              <DialogContent className="sm:max-w-sm">
                                                <DialogHeader>
                                                  <DialogTitle>Report</DialogTitle>
                                                  <DialogDescription>
                                                    Describe your report reason here. Click send report when you&apos;re
                                                    done.
                                                  </DialogDescription>
                                                </DialogHeader>
                                                <FieldGroup>
                                                  <Field>
                                                    <FieldLabel htmlFor="report-reason">Reason</FieldLabel>
                                                    <Textarea
                                                        id="report-reason"
                                                        name="report-reason"
                                                        placeholder="Type your reasons here."
                                                        maxLength={500}
                                                        value={reportValue?.reason ?? ""}
                                                        onChange={e=>setReportValue({reason: e.target.value})}/>
                                                  </Field>
                                                </FieldGroup>
                                                <DialogFooter>
                                                  <DialogClose render={<Button variant="outline" onClick={()=>setReportValue(null)}>Cancel</Button>} />
                                                  <Button onClick={()=>handleSubmitReport(publicProfile.id, reportValue)}>Send report</Button>
                                                </DialogFooter>
                                              </DialogContent>
                                            </form>
                                        </Dialog>
                                  </DropdownMenuGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        {likeError && <p className="p-1 m-auto">{likeError}</p>}
                        {blockError && <p className="p-1 m-auto">{blockError}</p>}
                        {reportError && <p className="p-1 m-auto">{reportError}</p>}
                        {visitError && <p className="p-1 m-auto">{visitError}</p>}
                        <div className="my-4 mx-8 sm:px-8">
                            <div>{publicProfile.gender}</div>
                            <div>{publicProfile.age} years old</div>
                            <div>Preference: {publicProfile.sexual_preference ?? "Not specified"}</div>
                            <div>Bio: {publicProfile.bio}</div>
                            <div>Location: {publicProfile.location_label}</div>
                            {!publicProfile.is_online && (<div>Last connection: {publicProfile.last_connection?? "Never"}</div>)}
                            <div>
                                <p>Tags:
                                {publicProfile.tags?.map(tag=>(
                                    <Badge
                                        key={tag.id}
                                        className="ml-1"
                                    >{tag.name}</Badge>
                                ))}
                                </p>
                            </div>
                            <div className="my-4">
                                <p>Gallery Photos</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                                    {publicProfile.photos?.map(p=>(
                                        <div key={p.id} className="w-full aspect-square">
                                        <img
                                            src={`${API_BASE_URL}${p.url}`}
                                            className="w-full h-full object-cover rounded cursor-pointer"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default PublicProfilePage
