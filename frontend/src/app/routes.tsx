import { Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from '../auth/ProtectedRoute'
import { ProfileCompleteRoute } from '../auth/ProfileCompleteRoute'
import { ProfileIncompleteRoute } from '../auth/ProfileIncompleteRoute'
import { PublicOnlyRoute } from '../auth/PublicOnlyRoute'
import { AuthLayout } from '../layouts/AuthLayout'
import { RootLayout } from '../layouts/RootLayout'
import { HomePage } from '../pages/HomePage'
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage'
import { LoginPage } from '../pages/auth/LoginPage'
import { RegisterPage } from '../pages/auth/RegisterPage'
import { ResetPasswordPage } from '../pages/auth/ResetPasswordPage'
import { FortyTwoCallbackPage } from '../pages/auth/FortyTwoCallbackPage'
import { ResendVerificationPage } from '../pages/auth/ResendVerificationPage'
import { VerifyEmailPage } from '../pages/auth/VerifyEmailPage'
import { ProfileCompletePage } from '../pages/profile/ProfileCompletePage'
import MyProfilePage from '@/pages/profile/MyProfilePage'
import SuggestPage from '@/pages/discovery/SuggestPage'
import Likes from '@/pages/social/LikesReceived'
import Visitors from '@/pages/social/Visitors'
import PublicProfilePage from '@/pages/profile/PublicProfilePage'
import { BlockListPage } from '@/pages/social/BlockListPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<ProtectedRoute />}>
        <Route element={<RootLayout />}>
          <Route element={<ProfileIncompleteRoute />}>
            <Route path="/profile/complete" element={<ProfileCompletePage />} />
          </Route>
          <Route element={<ProfileCompleteRoute />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/profile" element={<MyProfilePage />} />
            <Route path="/suggest" element={<SuggestPage />} />
            <Route path="/likes" element={<Likes />} />
            <Route path="/visitors" element={<Visitors />} />
            <Route path="/blocks" element={<BlockListPage />} />
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
