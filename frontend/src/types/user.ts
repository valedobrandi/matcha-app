export type UserProfile = {
    id: number
    email: string
    username: string
    first_name: string
    last_name: string
    is_verified: boolean
    created_at: string
    avatar: string | null
    gender: string | null
    age: number | null
    sexual_preference: string | null
    bio: string | null
    fame_rating: number
    latitude: number | null
    longitude: number | null
    last_connection: string | null
}