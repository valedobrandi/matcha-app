import { getAccessToken, setAccessToken } from './tokenStorage'

const DEV_ACCESS_TOKEN = import.meta.env.VITE_DEV_ACCESS_TOKEN

export function seedDevAccessToken(): void {
  if (!import.meta.env.DEV || !DEV_ACCESS_TOKEN) {
    return
  }

  if (getAccessToken()) {
    return
  }

  setAccessToken(DEV_ACCESS_TOKEN)
}