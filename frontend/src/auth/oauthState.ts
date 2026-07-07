const OAUTH_STATE_KEY = 'ft_oauth_state'

export function createOAuthState(): string {
  const state = crypto.randomUUID()
  sessionStorage.setItem(OAUTH_STATE_KEY, state)
  return state
}

export function validateOAuthState(returned: string | null): boolean {
  const stored = sessionStorage.getItem(OAUTH_STATE_KEY)
  return stored !== null && stored === returned
}

export function clearOAuthState(): void {
  sessionStorage.removeItem(OAUTH_STATE_KEY)
}

export function buildFortyTwoAuthorizeUrl(): string {
  const clientId = import.meta.env.VITE_FT_CLIENT_ID ?? 'ft_client_id'
  const redirectUri =
    import.meta.env.VITE_FT_REDIRECT_URI ??
    'http://localhost:5173/auth/callback/42'
  const state = createOAuthState()
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'public',
    state,
  })
  return `https://api.intra.42.fr/oauth/authorize?${params}`
}
