import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ApiError } from '../../api/client'
import * as authApi from '../../api/auth'
import { useAuth } from '../../auth/useAuth'
import { validateOAuthState, clearOAuthState } from '../../auth/oauthState'
import { resolveErrorMessage } from '../../i18n/errors'

export function FortyTwoCallbackPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { loginWithToken } = useAuth()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    if (!code) {
      setError('Missing OAuth code')
      return
    }
    if (!validateOAuthState(state)) {
      setError('Invalid OAuth state')
      return
    }

    authApi
      .fortytwoCallback(code)
      .then((response) => {
        if (cancelled) return
        clearOAuthState()
        loginWithToken(response.access_token)
        navigate('/')
      })
      .catch((err) => {
        if (cancelled) return
        clearOAuthState()
        if (err instanceof ApiError) {
          setError(resolveErrorMessage(err.code, err.message))
        } else {
          setError('OAuth login failed')
        }
      })

    return () => {
      cancelled = true
    }
  }, [loginWithToken, navigate, searchParams])

  if (error) {
    return (
      <div>
        <h1>42 login</h1>
        <p>{error}</p>
        <Link to="/auth/login">Go to login</Link>
      </div>
    )
  }

  return (
    <div>
      <h1>42 login</h1>
      <p>Completing sign in...</p>
    </div>
  )
}
