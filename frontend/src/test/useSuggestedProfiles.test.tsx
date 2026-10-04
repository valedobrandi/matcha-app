import { describe, it, expect, vi } from 'vitest'
import { server } from "./server"
import { http, HttpResponse } from 'msw'
import { API_BASE_URL, setOnUnauthorized } from '../api/client'
import useSuggestedProfiles from '../discovery/useSuggestedProfiles'
import { renderHook, waitFor, act } from '@testing-library/react'
import { authWrapper, makeAuthValue } from './renderWithAuth'
import { toQueryString } from '../api/query'
import {type DiscoveryProfile} from '../types/discovery'

const SUGGEST_URL = `${API_BASE_URL}/discovery/suggest`

function makeProfile(overrides: Partial<DiscoveryProfile> = {}): DiscoveryProfile {
    return {
        id: 1,
        username: 'alice',
        first_name: 'Alice',
        last_name: 'A',
        age: 25,
        gender: 'female',
        fame_rating: 80,
        common_tags_count: 2,
        location_label: 'Paris',
        liked_by_me: false,
        ...overrides,
    }
}

describe('useSuggestedProfiles', () => {
    it('First load success, return data then set has More', async () => {
        server.use(
            http.get(SUGGEST_URL, ({request}) => {
                const url = new URL(request.url)
                expect(url.searchParams.get('limit')).toBe('20')
                expect(url.searchParams.get('offset')).toBe('0')
                return HttpResponse.json([makeProfile()])
            })
        )

        const { result } = renderHook(
            ()=> useSuggestedProfiles({ limit: 20, sort: undefined, order: undefined }),
            {wrapper: authWrapper(makeAuthValue())}
        )

        expect(result.current.isLoading).toBe(true)
        await waitFor(()=> expect(result.current.isLoading).toBe(false))

        expect(result.current.suggestedProfiles).toHaveLength(1)
        expect(result.current.suggestedProfiles[0].username).toBe('alice')
        expect(result.current.serverError).toBeNull()
    })

    it('Error response with status code, serverError be setten', async ()=>{
        server.use(
            http.get(SUGGEST_URL, ()=> 
            HttpResponse.json(
                {detail: 'Something went wrong', code: 'SERVER_ERROR'},
                {status: 500}
            ))
        )

        const { result } = renderHook(
            () => useSuggestedProfiles({ limit: 20, sort: undefined, order: undefined }),
            { wrapper: authWrapper(makeAuthValue()) }
        )
        await waitFor(() => expect(result.current.serverError).not.toBeNull())
        expect(result.current.suggestedProfiles).toHaveLength(0)
    })

    it('code is USER_NOT_FOUND call logout()', async () => {
    server.use(
        http.get(SUGGEST_URL, () =>
            HttpResponse.json(
                { detail: 'User not found', code: 'USER_NOT_FOUND' },
                { status: 401 }
            )
        )
    )

    const logout = vi.fn()
    setOnUnauthorized(logout)
    renderHook(
      () => useSuggestedProfiles({ limit: 20, sort: undefined, order: undefined }),
      { wrapper: authWrapper(makeAuthValue()) }
    )

    await waitFor(() => expect(logout).toHaveBeenCalled())
    setOnUnauthorized(null)
  })

  it('LoadMore do increment instead replace data', async ()=>{
    server.use(
        http.get(SUGGEST_URL, ({request}) => {
            const url = new URL(request.url)
            const offset = url.searchParams.get('offset')
            if (offset === '0') {
                return HttpResponse.json(
                    Array.from({length: 20}, (_, i) => makeProfile({id: i + 1, username: `user${i + 1}`}))
                )
            }
            if (offset === '20')
                return HttpResponse.json([makeProfile({ id: 21, username: 'user21' })])
            return HttpResponse.json([])
        })
    )

    const filters = { limit: 20, sort: undefined, order: undefined }

    const { result } = renderHook(
        () => useSuggestedProfiles(filters),
        { wrapper: authWrapper(makeAuthValue()) }
    )

    await waitFor(()=>expect(result.current.isLoading).toBe(false))
    expect(result.current.suggestedProfiles).toHaveLength(20)
    expect(result.current.hasMore).toBe(true)

    act(()=> {
        result.current.loadMore()
    })
    await waitFor(()=>{
        expect(result.current.suggestedProfiles).toHaveLength(21)
    })
    expect(result.current.hasMore).toBe(false)
  })

  it('Send request failed without accessToken', async () => {
    let requestMade = false
    server.use(
        http.get(SUGGEST_URL, ()=>{
            requestMade = true
            return HttpResponse.json([])
        })
    )
    renderHook(
        () => useSuggestedProfiles({ limit: 20, sort: undefined, order: undefined }),
        { wrapper: authWrapper(makeAuthValue({accessToken: null})) }
    )

    await new Promise((r) => setTimeout(r, 50))
    expect(requestMade).toBe(false)
  })
})

describe('toQueryString', () => {
  it('Normal params', () => {
    expect(toQueryString({ limit: 20, offset: 0 })).toBe('?limit=20&offset=0')
  })

  it('Ignore undefined/null value', () => {
    expect(toQueryString({ limit: 20, sort: undefined })).toBe('?limit=20')
  })

  it('Append multi tags', () => {
    expect(toQueryString({ tag_ids: [1, 2, 3] })).toBe('?tag_ids=1&tag_ids=2&tag_ids=3')
  })

  it('Return null', () => {
    expect(toQueryString({})).toBe('')
  })
})