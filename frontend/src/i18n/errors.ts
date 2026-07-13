const ERROR_MESSAGES: Record<string, string> = {
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
}

const REGISTER_FIELDS = ['email', 'username', 'first_name', 'last_name', 'password'] as const
type RegisterField = (typeof REGISTER_FIELDS)[number]

export function isRegisterField(field: string): field is RegisterField {
  return REGISTER_FIELDS.includes(field as RegisterField)
}

export function resolveErrorMessage(
  code: string | undefined,
  fallback: string,
): string {
  if (code && ERROR_MESSAGES[code]) {
    return ERROR_MESSAGES[code]
  }
  return fallback
}