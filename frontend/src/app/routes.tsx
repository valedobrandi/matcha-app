import { lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from '../auth/ProtectedRoute'
import { ProfileCompleteRoute } from '../auth/ProfileCompleteRoute'
import { ProfileIncompleteRoute } from '../auth/ProfileIncompleteRoute'
import { PublicOnlyRoute } from '../auth/PublicOnlyRoute'
import { AuthLayout } from '../layouts/AuthLayout'
import { RootLayout } from '../layouts/RootLayout'

const ForgotPasswordPage = lazy(() => import('../pages/auth/ForgotPasswordPage').then(page => ({ default: page.ForgotPasswordPage })))
const LoginPage = lazy(() => import('../pages/auth/LoginPage').then(page => ({ default: page.LoginPage })))
const RegisterPage = lazy(() => import('../pages/auth/RegisterPage').then(page => ({ default: page.RegisterPage })))
const ResetPasswordPage = lazy(() => import('../pages/auth/ResetPasswordPage').then(page => ({ default: page.ResetPasswordPage })))
const FortyTwoCallbackPage = lazy(() => import('../pages/auth/FortyTwoCallbackPage').then(page => ({ default: page.FortyTwoCallbackPage })))
const ResendVerificationPage = lazy(() => import('../pages/auth/ResendVerificationPage').then(page => ({ default: page.ResendVerificationPage })))
const VerifyEmailPage = lazy(() => import('../pages/auth/VerifyEmailPage').then(page => ({ default: page.VerifyEmailPage })))
const ProfileCompletePage = lazy(() => import('../pages/profile/ProfileCompletePage').then(page => ({ default: page.ProfileCompletePage })))
const MyProfilePage = lazy(() => import('@/pages/profile/MyProfilePage'))
const SuggestPage = lazy(() => import('@/pages/discovery/SuggestPage'))
const Likes = lazy(() => import('@/pages/social/LikesReceived'))
const Visitors = lazy(() => import('@/pages/social/Visitors'))
const PublicProfilePage = lazy(() => import('@/pages/profile/PublicProfilePage'))
const BlockListPage = lazy(() => import('@/pages/social/BlockListPage').then(page => ({ default: page.BlockListPage })))
const NotificationsPage = lazy(() => import('@/pages/notifications/NotificationsPage').then(page => ({ default: page.NotificationsPage })))
const ChatListPage = lazy(() => import('@/pages/chat/ChatListPage').then(page => ({ default: page.ChatListPage })))
const ConversationPage = lazy(() => import('@/pages/chat/ConversationPage').then(page => ({ default: page.ConversationPage })))

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<ProtectedRoute />}>
        <Route element={<RootLayout />}>
          <Route element={<ProfileIncompleteRoute />}>
            <Route path="/profile/complete" element={<ProfileCompletePage />} />
          </Route>
          <Route element={<ProfileCompleteRoute />}>
            <Route path="/" element={<Navigate to="/suggest" replace />} />
            <Route path="/profile" element={<MyProfilePage />} />
            <Route path="/suggest" element={<SuggestPage />} />
            <Route path="/likes" element={<Likes />} />
            <Route path="/visitors" element={<Visitors />} />
            <Route path="/blocks" element={<BlockListPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/chat" element={<ChatListPage />} />
            <Route path="/chat/:peerId" element={<ConversationPage />} />
            <Route path="/users/:userId" element={<PublicProfilePage />} />
          </Route>
        </Route>
      </Route>

      {/* Token-driven entry points: reachable while logged in or out, so they
          sit outside PublicOnlyRoute but still need the layout landmarks. */}
      <Route element={<AuthLayout />}>
        <Route path="/auth/verify" element={<VerifyEmailPage />} />
        <Route path="/auth/callback/42" element={<FortyTwoCallbackPage />} />
        <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
      </Route>

      <Route element={<PublicOnlyRoute />}>
        <Route element={<AuthLayout />}>
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/auth/register" element={<RegisterPage />} />
          <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/auth/resend-verification" element={<ResendVerificationPage />} />
        </Route>
      </Route>
    </Routes>
  )
}
