import { apiGet, apiPost } from "./client";
import type {
    ForgotPasswordInput,
    LoginInput,
    MessageResponse,
    RegisterInput,
    ResetPasswordInput,
    ResetPasswordResponse,
    TokenResponse
} from '../types/auth'

export function register(payload: RegisterInput): Promise<MessageResponse> {
    return apiPost<MessageResponse>('/auth/register', payload)
}

export function login(payload: LoginInput): Promise<TokenResponse> {
    return apiPost<TokenResponse>('/auth/login', payload)
}

export function verifyEmail(token: string): Promise<TokenResponse> {
    return apiGet<TokenResponse>(`/auth/verify/${token}`)
}

export function forgotPassword(
    payload: ForgotPasswordInput
): Promise<MessageResponse> {
    return apiPost<MessageResponse>(`/auth/forgot-password`, payload)
}

export function resetPassword(
    payload: ResetPasswordInput
): Promise<ResetPasswordResponse> {
    return apiPost<ResetPasswordResponse>('/auth/reset-password', payload)
}

export function resendVerification(email: string): Promise<MessageResponse> {
    return apiPost<MessageResponse>('/auth/resend-verification', { email })
}

export function fortytwoCallback(code: string): Promise<TokenResponse> {
    return apiPost<TokenResponse>(`/auth/callback/42?code=${encodeURIComponent(code)}`, {})
}