import useUserProfile from "@/users/useUserProfile"
import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import likes from "@/assets/likes.png"
import vues from "@/assets/vues.png"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import ProfileTab from "@/components/ProfileTab"
import type { UserProfile } from "@/types/user"
import AccountTab from "@/components/AccountTab"
import { useQuery } from "@tanstack/react-query"
import { toServerMessage } from "@/hooks/toServerMessage"
import * as usersApi from "@/api/users"
import { useAuth } from "@/auth/useAuth"
import { API_BASE_URL } from "@/api/client"
import { FieldError } from "@/components/ui/field"
import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router-dom"

function MyProfilePage() {
    const { accessToken } = useAuth()
    const { profile, error, fetchProfile } = useUserProfile()
    const photos = useQuery({
        queryKey: ["my-photos", accessToken],
        queryFn: () => usersApi.getMyPhotos(accessToken!),
        enabled: !!accessToken,
    })
    const serverError = toServerMessage(photos.error)
    const avatar = photos.data?.find(p=>p.is_profile_photo)?.url ?? null
    const navigate = useNavigate()

    if (error) {
        return (
            <div>{error}</div>
        )
    }
    if (!profile) {
        return (
            <div>
                <p>Loading...</p>
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto">
            <div>
                {serverError && <FieldError>{serverError}</FieldError>}
                <Avatar className="w-16 h-16 mx-auto">
                    <AvatarImage src={avatar ? `${API_BASE_URL}${avatar!}` : undefined} alt={profile?.username} />
                    <AvatarFallback>CN</AvatarFallback>
                    <AvatarBadge className="bg-green-600 dark:bg-green-800" />
                </Avatar>
            </div>
            <div className="flex flex-col">
                <h1 className="m-auto">{profile.username}</h1>
                <div className="flex flex-row justify-center gap-3">
                    <div className="flex flex-row items-center gap-1">
                        <p>{profile.likes_received_count ?? 0}</p>
                        <img src={likes} alt="likes" className="w-5 h-5 object-cover rounded cursor-pointer"/>
                    </div>
                    <div className="flex flex-row items-center gap-1">
                        <p>{profile.visitors_count ?? 0}</p>
                        <img src={vues} alt="vues" className="w-5 h-5 object-cover rounded cursor-pointer"/>
                    </div>
                </div>
                <div className="flex flex-row justify-center gap-3">
                    <div className="flex flex-row items-center gap-1">
                        <p>10</p>
                        <p>Popularity</p>
                    </div>
                </div>
                <div className="m-auto mt-1">
                    <Button variant="outline" onClick={()=>navigate('/blocks')}>See block list</Button>
                </div>
            </div>
            <ProfileTabs profile={profile!} onSaved={fetchProfile}/>
        </div>
    )
}

export function ProfileTabs({profile, onSaved} : {profile : UserProfile, onSaved: ()=>void}) {

    return (
        <Tabs defaultValue="Profile" className="w-ful my-5">
            <TabsList>
                <TabsTrigger value="Profile">Profile</TabsTrigger>
                <TabsTrigger value="account">account</TabsTrigger>
            </TabsList>
            <TabsContent value="Profile">
                <ProfileTab profile={profile} onSaved={onSaved} />
            </TabsContent>
            <TabsContent value="account">
                <AccountTab profile={profile} onSaved={onSaved}/>
            </TabsContent>
        </Tabs>
    )
}

export default MyProfilePage