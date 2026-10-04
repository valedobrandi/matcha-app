import { describe, it, expect } from 'vitest'
import { http, HttpResponse } from 'msw'
import { act, renderHook, waitFor } from '@testing-library/react'
import { server } from './server'
import { authWrapper, makeAuthValue } from './renderWithAuth'
import { API_BASE_URL } from '../api/client'
import useSuggestedProfiles from '../discovery/useSuggestedProfiles'
import type { DiscoveryProfile } from '../types/discovery'

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

describe('usePagination', () => {
    it('does apply new filters when the previous request is still in flight', async () => {
        let releaseStale!: () => void
        const staleGate = new Promise<void>(resolve => { releaseStale = resolve })
        let staleServed = false
        server.use(
            http.get(SUGGEST_URL, async ({ request }) => {
                if (new URL(request.url).searchParams.get('sort') === 'age') {
                    await staleGate
                    staleServed = true
                    return HttpResponse.json([makeProfile({ id: 1, username: 'stale' })])
                }
                return HttpResponse.json([makeProfile({ id: 2, username: 'fresh' })])
            })
        )

        const { result, rerender } = renderHook(
            ({ filters }) => useSuggestedProfiles(filters),
            {
                wrapper: authWrapper(makeAuthValue()),
                initialProps: { filters: { limit: 20, sort: 'age', order: undefined } },
            }
        )
        rerender({ filters: { limit: 20, sort: 'fame', order: undefined } })

        await waitFor(() => expect(result.current.suggestedProfiles.map(p => p.username)).toEqual(['fresh']))

        releaseStale()
        await waitFor(() => expect(staleServed).toBe(true))
        await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)) })

        expect(result.current.suggestedProfiles.map(p => p.username)).toEqual(['fresh'])
        expect(result.current.isLoading).toBe(false)
    })

    it('does request the next page with the latest limit when filters changed', async () => {
        const offsets: Array<string | null> = []
        server.use(
            http.get(SUGGEST_URL, ({ request }) => {
                const params = new URL(request.url).searchParams
                offsets.push(params.get('offset'))
                const limit = Number(params.get('limit'))
                return HttpResponse.json(
                    Array.from({ length: limit }, (_, i) => makeProfile({ id: i + 1, username: `u${i + 1}` }))
                )
            })
        )

        const { result, rerender } = renderHook(
            ({ filters }) => useSuggestedProfiles(filters),
            {
                wrapper: authWrapper(makeAuthValue()),
                initialProps: { filters: { limit: 2, sort: undefined, order: undefined } },
            }
        )
        await waitFor(() => expect(result.current.isLoading).toBe(false))
        rerender({ filters: { limit: 3, sort: undefined, order: undefined } })
        await waitFor(() => expect(result.current.suggestedProfiles).toHaveLength(3))
        await waitFor(() => expect(result.current.isLoading).toBe(false))

        act(() => { result.current.loadMore() })

        await waitFor(() => expect(offsets).toEqual(['0', '0', '3']))
    })

    it('does expose serverError and keep hasMore true when the first page fails', async () => {
        server.use(
            http.get(SUGGEST_URL, () =>
                HttpResponse.json({ detail: 'boom', code: 'SERVER_ERROR' }, { status: 500 })
            )
        )

        const { result } = renderHook(
            () => useSuggestedProfiles({ limit: 20, sort: undefined, order: undefined }),
            { wrapper: authWrapper(makeAuthValue()) }
        )

        await waitFor(() => expect(result.current.serverError).not.toBeNull())
        expect(result.current.hasMore).toBe(true)
    })
})
