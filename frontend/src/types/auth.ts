import type { components } from "./api"

export type RegisterInput = components["schemas"]["UserRegisterInput"]
export type LoginInput = components["schemas"]["LoginInput"]
export type ForgotPasswordInput = components["schemas"]["ForgotPasswordInput"]
export type ResetPasswordInput = components["schemas"]["ResetPasswordInput"]
export type MessageResponse = components["schemas"]["RegisterResponse"]
export type TokenResponse = components["schemas"]["TokenResponse"]
export type LogoutResponse = components["schemas"]["LogoutResponse"]
export type ResetPasswordResponse = components["schemas"]["ResetPasswordResponse"]
export type CurrentUser = components["schemas"]["CurrentUserResponse"]
