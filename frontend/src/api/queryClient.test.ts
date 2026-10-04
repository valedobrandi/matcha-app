import { describe, it, expect } from 'vitest'
import { ApiError } from './client'
import { shouldRetry } from './queryClient'

describe('shouldRetry', () => {
  it('does not retry when the API answers with a client error', () => {
    expect(shouldRetry(0, new ApiError(404, 'gone', 'USER_NOT_FOUND'))).toBe(false)
  })

  it('does retry when the API answers with a server error', () => {
    expect(shouldRetry(0, new ApiError(500, 'boom'))).toBe(true)
  })

  it('does stop retrying after the retry budget is spent', () => {
    expect(shouldRetry(2, new TypeError('network down'))).toBe(false)
  })
})
