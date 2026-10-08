import { z } from 'zod'

// Checked for presence before format, so an untouched field reports "required"
// like every other field rather than "Invalid email".
const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .max(100, 'Email must be at most 100 characters')
  .pipe(z.email('Invalid email'))

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .refine(password => new TextEncoder().encode(password).length <= 72, 'Password is too long')

export const nameSchema = (label: string) => z
  .string()
  .trim()
  .min(1, `${label} is required`)
  .max(50, `${label} must be at most 50 characters`)

export const registerSchema = z.object({
  email: emailSchema,
  username: nameSchema('Username'),
  first_name: nameSchema('First name'),
  last_name: nameSchema('Last name'),
  password: passwordSchema,
})

export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
})

export const forgotPasswordSchema = z.object({
  email: emailSchema,
})

export const resetPasswordSchema = z.object({
  password: passwordSchema,
})

export const resendVerificationSchema = z.object({
  email: emailSchema,
})

export type RegisterValues = z.infer<typeof registerSchema>
export type LoginValues = z.infer<typeof loginSchema>
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>
export type ResendVerificationValues = z.infer<typeof resendVerificationSchema>
