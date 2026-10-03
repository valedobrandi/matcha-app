import { describe, it, expect } from 'vitest'
import type { ReactNode } from 'react'
import { server } from './server'
import { http, HttpResponse } from 'msw'
import { API_BASE_URL } from '../api/client'
import { act, renderHook, waitFor } from '@testing-library/react'
import { authWrapper, makeAuthValue } from './renderWithAuth'
import { AuthContext } from '@/auth/AuthContext'
import { useVisitTracker } from '../social/useVisitTracker'

const VISIT_URL = `${API_BASE_URL}/social/visits/:id`

describe('useVisitTracker', ()=>{
    it('does post only a single visit when rerendered with the same target', async () => {
        let callCount = 0
        server.use(
            http.post(VISIT_URL, () => {
                callCount++
                return HttpResponse.json({ ok: true })
            })
        )

        const { rerender } = renderHook(
            ({ id }) => useVisitTracker(id),
            {
                wrapper: authWrapper(makeAuthValue()),
                initialProps: { id: 5 },
            }
        )

        await waitFor(() => expect(callCount).toBe(1))

        rerender({ id: 5 })
        await act(async () => {})
        expect(callCount).toBe(1)
    })

    it('does expose visitError and post again after the token changes when the visit failed', async () => {
        let callCount = 0
        server.use(
            http.post(VISIT_URL, () => {
                callCount++
                if (callCount === 1)
                    return HttpResponse.json({ detail: 'boom', code: 'SERVER_ERROR' }, { status: 500 })
                return HttpResponse.json({ ok: true })
            })
        )
        const authByToken = {
            first: makeAuthValue({ accessToken: 'first' }),
            second: makeAuthValue({ accessToken: 'second' }),
        }
        let current: keyof typeof authByToken = 'first'
        const Wrapper = ({ children }: { children: ReactNode }) => (
            <AuthContext.Provider value={authByToken[current]}>{children}</AuthContext.Provider>
        )

        const { result, rerender } = renderHook(() => useVisitTracker(5), { wrapper: Wrapper })
        await waitFor(() => expect(result.current.visitError).not.toBeNull())
        expect(callCount).toBe(1)

        current = 'second'
        rerender()

        await waitFor(() => expect(callCount).toBe(2))
        await waitFor(() => expect(result.current.visitError).toBeNull())
    })
})
