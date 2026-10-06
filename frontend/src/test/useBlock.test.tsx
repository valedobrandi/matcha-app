import { describe, it, expect } from 'vitest'
import { http, HttpResponse } from 'msw'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useQueryClient } from '@tanstack/react-query'
import { server } from './server'
import { authWrapper, makeAuthValue } from './renderWithAuth'
import { API_BASE_URL } from '../api/client'
import { useBlock } from '../social/useBlock'
import useVisitors from '../social/useVisitors'
import useLikesReceived from '../social/useLikesReceived'
import useUserProfile from '../users/useUserProfile'
import { NOTIFICATIONS_KEY, UNREAD_COUNT_KEY } from '../notifications/queryKeys'

const BOB = { id: 5, username: 'bob', first_name: 'Bob', last_name: 'B' }

describe('useBlock', () => {
    it('does refresh the lists and my counts that hide blocked users when a user is blocked', async () => {
        let blocked = false
        server.use(
            http.get(`${API_BASE_URL}/social/visitors`, () =>
                HttpResponse.json(blocked ? [] : [{ ...BOB, visited_at: '2026-01-01T00:00:00Z' }])),
            http.get(`${API_BASE_URL}/social/likes/received`, () =>
                HttpResponse.json(blocked ? [] : [{ ...BOB, liked_at: '2026-01-01T00:00:00Z' }])),
            http.get(`${API_BASE_URL}/users/me`, () =>
                HttpResponse.json({ id: 1, username: 'me', likes_received_count: blocked ? 0 : 1 })),
            http.post(`${API_BASE_URL}/social/blocks/:id`, () => {
                blocked = true
                return HttpResponse.json({ blocked: true })
            }),
        )
        const { result } = renderHook(() => ({
            visitors: useVisitors({ limit: 20 }),
            likes: useLikesReceived({ limit: 20 }),
            me: useUserProfile(),
            blocking: useBlock(),
        }), { wrapper: authWrapper(makeAuthValue()) })
        await waitFor(() => expect(result.current.me.profile?.likes_received_count).toBe(1))
        await waitFor(() => expect(result.current.visitors.visitorsList).toHaveLength(1))
        await waitFor(() => expect(result.current.likes.likesReceivedList).toHaveLength(1))

        await act(() => result.current.blocking.block(BOB.id))

        await waitFor(() => expect(result.current.visitors.visitorsList).toEqual([]))
        expect(result.current.likes.likesReceivedList).toEqual([])
        expect(result.current.me.profile?.likes_received_count).toBe(0)
    })

    it('does refresh the notifications and their unread count when a user is blocked', async () => {
        server.use(
            http.post(`${API_BASE_URL}/social/blocks/:id`, () => HttpResponse.json({ blocked: true })),
        )
        const { result } = renderHook(() => ({
            queryClient: useQueryClient(),
            blocking: useBlock(),
        }), { wrapper: authWrapper(makeAuthValue()) })
        result.current.queryClient.setQueryData([UNREAD_COUNT_KEY], { unread_count: 1 })
        result.current.queryClient.setQueryData([NOTIFICATIONS_KEY], [])

        await act(() => result.current.blocking.block(BOB.id))

        expect(result.current.queryClient.getQueryState([UNREAD_COUNT_KEY])?.isInvalidated).toBe(true)
        expect(result.current.queryClient.getQueryState([NOTIFICATIONS_KEY])?.isInvalidated).toBe(true)
    })
})
