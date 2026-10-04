import type { ErrorCode } from '@/api/client'

const ERROR_MESSAGES: Partial<Record<ErrorCode, string>> = {
  AUTH_ERROR: 'Something went wrong. Please try again.',
  EMAIL_TAKEN: 'This email is already registered.',
  USERNAME_TAKEN: 'This username is already taken.',
  INVALID_CREDENTIALS: 'Invalid username or password.',
  ACCOUNT_NOT_VERIFIED: 'This account has not been verified via email yet.',
  OAUTH_EXCHANGE_FAILED: 'Failed to exchange OAuth code for access token.',
  INVALID_VERIFICATION_TOKEN: 'Invalid or expired verification token.',
  OAUTH_ACCOUNT_CONFLICT:
    'An account exists with this email or username. Please login with your credentials.',
  INVALID_RESET_TOKEN: 'Invalid or expired password reset token.',
  USER_NOT_FOUND: 'We could not find your account, please log in again.',
  TAG_CONTENT_PROFANITY: 'Your tag contains profanity content.',
  FILE_TOO_LARGE: 'File size allows maximum 5MB.',
  MAX_FIVE_PHOTOS: 'You can upload maximun 5 photos.',
  LOCATION_REQUIRED: 'Your location is required for this discovery query',
  INVALID_FILTER: 'The filters setting is invalid.',
  BLOCKED: 'The user is blocked by you, profile is currently unavailable',
  TARGET_USER_NOT_FOUND: 'We could not find target account, please try it later',
  CHAT_USER_NOT_FOUND: 'We could not find this user, please try it later',
  NOTIFICATION_NOT_FOUND: 'We could not find this notification.',
}

const REGISTER_FIELDS = ['email', 'username', 'first_name', 'last_name', 'password'] as const
type RegisterField = (typeof REGISTER_FIELDS)[number]

export function isRegisterField(field: string): field is RegisterField {
  return REGISTER_FIELDS.includes(field as RegisterField)
}

export function resolveErrorMessage(
  code: ErrorCode | undefined,
  fallback: string,
): string {
  return (code && ERROR_MESSAGES[code]) || fallback
}