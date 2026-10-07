import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { act, renderHook } from '@testing-library/react'
import { useQueryClient } from '@tanstack/react-query'
import { server } from './server'
import { authWrapper, makeAuthValue } from './renderWithAuth'
import { API_BASE_URL } from '@/api/client'
import { CONNECTIONS_KEY, CONVERSATION_KEY } from '@/chat/queryKeys'
import { useLikes } from '@/social/useLikes'

describe('useLikes', () => {
    it.each([
        ['like', 'post'],
        ['unlike', 'delete'],
    ] as const)('does refresh the chat list and the open conversation after an %s', async (action, method) => {
        server.use(http[method](`${API_BASE_URL}/social/likes/:id`, () =>
            HttpResponse.json({ liked: action === 'like', connected: action === 'like' })))
        const { result } = renderHook(() => ({
            queryClient: useQueryClient(),
            likes: useLikes(),
        }), { wrapper: authWrapper(makeAuthValue()) })
        result.current.queryClient.setQueryData([CONNECTIONS_KEY], [])
        result.current.queryClient.setQueryData([CONVERSATION_KEY, 5], { pages: [[]], pageParams: [undefined] })

        await act(() => result.current.likes[action](5))

        expect(result.current.queryClient.getQueryState([CONNECTIONS_KEY])?.isInvalidated).toBe(true)
        expect(result.current.queryClient.getQueryState([CONVERSATION_KEY, 5])?.isInvalidated).toBe(true)
    })
})
