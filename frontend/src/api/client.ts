const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export class ApiError extends Error {
  status: number
  code?: string
  field?: string

  constructor(status: number, message: string, code?: string, field?: string) {
    super(message)
    this.status = status
    this.code = code
    this.field = field
  }
}

type RequestOptions = {
  token?: string
}

type ParsedError = {
  detail?: string
  code?: string
  field?: string
}

async function parseError(response: Response): Promise<ParsedError> {
  try {
    const body = (await response.json()) as { 
      detail?: string 
      code?: string 
      field?: string 
    }
    if (typeof body.detail === 'string') {
      return {
        detail: body.detail,
        code: body.code,
        field: body.field,
      }
    }
  } catch {
     // Body was not JSON; fall back to status text.
  }
  return {
    detail: response.statusText,
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options?: RequestOptions,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (options?.token) {
    headers.Authorization = `Bearer ${options.token}`
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (!response.ok) {
    const parsedError = await parseError(response)
    throw new ApiError(
      response.status,
      parsedError.detail ?? 'Request failed',
      parsedError.code,
      parsedError.field,
    )
  }

  return response.json() as Promise<T>
}

export function apiGet<T>(path: string, options?: RequestOptions): Promise<T> {
  return request<T>('GET', path, undefined, options)
}

export function apiPost<T>(
  path: string,
  body: unknown,
  options?: RequestOptions,
): Promise<T> {
  return request<T>('POST', path, body, options)
}
