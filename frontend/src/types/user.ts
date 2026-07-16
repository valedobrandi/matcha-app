export type UserProfile = {
    id: number
    email: string
    username: string
    first_name: string
    last_name: string
    is_verified: boolean
    created_at: string
    gender: string | null
    sexual_preference: string | null
    age: number | null
    bio: string | null
    fame_rating: number
    latitude: number | null
    longitude: number | null
    last_connection: string | null
    is_profile_completed: boolean
}

export type Tag = {
    id: number
    name: string
}

export type TagInput = {
    name: string
}

export type Photo = {
    id: number
    url: string
    is_profile_photo: boolean
}