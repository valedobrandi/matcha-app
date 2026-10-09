import { describe, it, expect } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import { API_BASE_URL } from './client'
import { getTags } from './tags'

describe('getTags', () => {
  it('does send the whole search text when it holds characters that mean something in a URL', async () => {
    const searches: (string | null)[] = []
    server.use(
      http.get(`${API_BASE_URL}/tags`, ({ request }) => {
        searches.push(new URL(request.url).searchParams.get('search'))
        return HttpResponse.json([])
      }),
    )

    await getTags('test-token', '#rock&roll')

    expect(searches).toEqual(['#rock&roll'])
  })
})
