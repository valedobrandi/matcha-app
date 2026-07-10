export type RegisterInput = {
  email: string
  username: string
  first_name: string
  last_name: string
  password: string
}

export type LoginInput = {
  username: string
  password: string
}

export type ForgotPasswordInput = {
  email: string
}

export type ResetPasswordInput = {
  token: string
  password: string
}

export type MessageResponse = {
  message: string
}

export type TokenResponse = {
  access_token: string
  token_type: string
}

export type ResetPasswordResponse = {
  message: string
  access_token: string
  token_type: string
}

export type CurrentUser = {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  email_verified: boolean
  profile_completed: boolean
  has_password: boolean
}
