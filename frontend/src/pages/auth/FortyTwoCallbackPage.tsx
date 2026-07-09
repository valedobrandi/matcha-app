import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ApiError } from '../../api/client'
import * as authApi from '../../api/auth'
import { useAuth } from '../../auth/useAuth'
import { validateOAuthState, clearOAuthState } from '../../auth/oauthState'
import { resolveErrorMessage } from '../../i18n/errors'

function getOAuthValidationError(
  code: string | null,
  state: string | null,
): string | null {
  if (!code) {
    return 'Missing OAuth code'
  }
  if (!validateOAuthState(state)) {
    return 'Invalid OAuth state'
  }
  return null
}

export function FortyTwoCallbackPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { loginWithToken } = useAuth()
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const validationError = getOAuthValidationError(code, state)
  const [requestError, setRequestError] = useState<string | null>(null)
  const error = validationError ?? requestError

  useEffect(() => {
    if (validationError || !code) {
      return
    }

    let cancelled = false

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
          setRequestError(resolveErrorMessage(err.code, err.message))
        } else {
          setRequestError('OAuth login failed')
        }
      })

    return () => {
      cancelled = true
    }
  }, [code, loginWithToken, navigate, validationError])

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
