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
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) {
      setError('Missing verification token')
      return
    }

    authApi
      .verifyEmail(token)
      .then((response) => {
        loginWithToken(response.access_token)
        navigate('/')
      })
      .catch((err) => {
        if (err instanceof ApiError) {
          setError(resolveErrorMessage(err.code, err.message))
        } else {
          setError('Failed to verify email')
        }
      })
  }, [loginWithToken, navigate, searchParams])

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
