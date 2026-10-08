import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { MailWarningIcon } from 'lucide-react'
import { ApiError } from '../../api/client'
import * as authApi from '../../api/auth'
import { useAuth } from '../../auth/useAuth'
import { resolveErrorMessage } from '../../i18n/errors'
import { AuthStatusCard } from '../../components/auth-status-card'
import { Button } from '../../components/ui/button'
import { Spinner } from '../../components/ui/spinner'
import type { TokenResponse } from '../../types/auth'

const verificationsByToken = new Map<string, Promise<TokenResponse>>()

export function VerifyEmailPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { loginWithToken } = useAuth()
  const token = searchParams.get('token')
  const validationError = token ? null : 'Missing verification token'
  const [requestError, setRequestError] = useState<string | null>(null)
  const error = validationError ?? requestError

  useEffect(() => {
    if (!token) {
      return
    }

    let cancelled = false
    const verification = verificationsByToken.get(token) ?? authApi.verifyEmail(token)
    verificationsByToken.set(token, verification)

    verification
      .then(async (response) => {
        if (cancelled) return
        await loginWithToken(response.access_token)
        navigate('/')
      })
      .catch((err) => {
        if (cancelled) return
        if (err instanceof ApiError) {
          setRequestError(resolveErrorMessage(err.code, err.message))
        } else {
          setRequestError('Failed to verify email')
        }
      })

    return () => {
      cancelled = true
    }
  }, [loginWithToken, navigate, token])

  if (error) {
    return (
      <AuthStatusCard
        icon={<MailWarningIcon />}
        title="We couldn't verify your email"
        description={error}
        action={
          <Button
            nativeButton={false}
            render={<Link to="/auth/resend-verification" />}
          >
            Send a new link
          </Button>
        }
      />
    )
  }

  return (
    <AuthStatusCard
      icon={<Spinner />}
      title="Verifying your account"
      description="This only takes a moment."
    />
  )
}
