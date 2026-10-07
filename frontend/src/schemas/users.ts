import { z } from 'zod'
import { nameSchema, passwordSchema } from './auth'

export const profileSchema = z.object({
    age: z.number().min(18, "You must be at least 18").max(100),
    gender: z.enum(["male", "female", "other"]),
    sexual_preference: z.enum(["man", "woman", "bisexual"]).optional(),
    bio: z.string().trim().min(1, "Bio is required").max(1000, "Bio must be at most 1000 characters"),
})

export const editProfileSchema = profileSchema.extend({
    latitude: z.number().nullable(),
    longitude: z.number().nullable(),
    location_label: z.string().trim().max(100, "Location must be at most 100 characters").nullable(),
    location_consent: z.boolean()
}).refine(
    (data) =>
        data.latitude !== null &&
        data.longitude !== null &&
        !!data.location_label &&
        data.location_label.trim().length > 0,
    {
        path: ["location_label"],
        message: "Please enter your location manually or enable location sharing."
    }
)

export const accountSchema = z.object({
  username: nameSchema('Username'),
  first_name: nameSchema('First name'),
  last_name: nameSchema('Last name'),
  email: z.email('Invalid email').max(100, 'Email must be at most 100 characters')
})

export const passwordchangeSchema = z.object({
    current_password: passwordSchema,
    new_password: passwordSchema,
    confirm_password: passwordSchema,
}).refine(
    (data) =>
        data.confirm_password === data.new_password,
    {
        path: ["confirm_password"],
        message: "Your passwords are not the same."
    }
)

export type ProfileValues = z.infer<typeof profileSchema>
export type EditProfileValues = z.infer<typeof editProfileSchema>
export type AccountValues = z.infer<typeof accountSchema>
export type PasswordChangeValues = z.infer<typeof passwordchangeSchema>
