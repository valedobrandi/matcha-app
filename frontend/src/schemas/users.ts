import { z } from 'zod'

export const profileSchema = z.object({
    age: z.number().min(18, "You must be at least 18").max(100),
    gender: z.enum(["male", "female", "other"]),
    sexual_preference: z.enum(["man", "woman", "bisexual"]),
    bio: z.string().min(1, "Bio is required"),
})

export type ProfileValues = z.infer<typeof profileSchema>
