import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ApiError } from '../../api/client'
import * as authApi from '../../api/auth'
import { useAuth } from '../../auth/useAuth'
import { resolveErrorMessage } from '../../i18n/errors'

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

    authApi
      .verifyEmail(token)
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
      <div>
        <h1>Email verification</h1>
        <p>{error}</p>
        <Link to="/auth/login">Go to login</Link>
      </div>
    )
  }

  return (
    <div>
      <h1>Email verification</h1>
      <p>Verifying your account...</p>
    </div>
  )
}
