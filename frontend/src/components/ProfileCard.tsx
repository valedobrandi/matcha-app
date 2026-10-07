import { API_BASE_URL } from "@/api/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { DiscoveryProfile } from "@/types/discovery"
import likes from "@/assets/likes.png"
import unlike from "@/assets/unlike.png"
import { useNavigate } from "react-router-dom"
import type { LikeStateResponse } from "@/types/social"

type ProfileCardProps = {
    profile: DiscoveryProfile
    onLike: (targetId: number) => void
    onUnlike: (targetId: number) => void
    likeState: Record<number, LikeStateResponse> | null
}

export function ProfileCard({profile, onLike, onUnlike, likeState}: ProfileCardProps) {
    const navigate = useNavigate()
    const isLiked = likeState?.[profile.id]?.liked ?? profile.liked_by_me
    
    return (
      <div data-testid="profile-card" className="relative w-[350px] max-w-sm w-full rounded-3xl overflow-hidden cursor-pointer"
        onClick={()=>navigate(`/users/${profile.id}`)}>
          <div className="relative h-[380px]">
              {profile.profile_photo_url ? (
                  <img
                      src={`${API_BASE_URL}${profile.profile_photo_url}`}
                      alt={`${profile.first_name}'s profile`}
                      className="z-0 h-full w-full object-cover" />
              ) : (
                  <div
                      role="img"
                      aria-label={`${profile.first_name}'s profile`}
                      className="z-0 flex h-full w-full items-center justify-center bg-muted text-6xl font-bold text-muted-foreground">
                      {profile.first_name[0]}{profile.last_name[0]}
                  </div>
              )}
          </div>
          <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent p-5 text-white">
              <Button variant="outline" size="icon"
                onClick={e=>{
                    e.stopPropagation()
                    if (!isLiked)
                        onLike(profile.id)
                    else
                        onUnlike(profile.id)
                }}>
                {isLiked && <img src={likes} alt="like" className="w-4 h-4 object-cover rounded cursor-pointer"/>}
                {!isLiked && <img src={unlike} alt="unlike" className="w-4 h-4 object-cover rounded cursor-pointer"/>}
              </Button>
              <div className="flex gap-1 flex-wrap">
                  <h2 className="text-2xl font-bold">{profile.first_name}</h2>
                  <Badge variant="secondary">fame</Badge>
              </div>
              <p className="text-xs">{profile.age} years old</p>
              <p>{profile.location_label}</p>
          </div>
      </div>
    )
}
