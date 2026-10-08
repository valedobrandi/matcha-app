import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ShieldAlertIcon } from 'lucide-react'
import { ApiError } from '../../api/client'
import * as authApi from '../../api/auth'
import { useAuth } from '../../auth/useAuth'
import { validateOAuthState, clearOAuthState } from '../../auth/oauthState'
import { resolveErrorMessage } from '../../i18n/errors'
import { AuthStatusCard } from '../../components/auth-status-card'
import { Button } from '../../components/ui/button'
import { Spinner } from '../../components/ui/spinner'
import type { TokenResponse } from '../../types/auth'

const exchangesByCode = new Map<string, Promise<TokenResponse>>()

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
    const exchange = exchangesByCode.get(code) ?? authApi.fortytwoCallback(code)
    exchangesByCode.set(code, exchange)

    exchange
      .then(async (response) => {
        if (cancelled) return
        clearOAuthState()
        await loginWithToken(response.access_token)
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
      <AuthStatusCard
        icon={<ShieldAlertIcon />}
        title="42 sign-in didn't complete"
        description={error}
        action={
          <Button nativeButton={false} render={<Link to="/auth/login" />}>
            Back to login
          </Button>
        }
      />
    )
  }

  return (
    <AuthStatusCard
      icon={<Spinner />}
      title="Completing sign in"
      description="Finishing up with 42."
    />
  )
}
