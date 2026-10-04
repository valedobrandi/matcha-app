import { API_BASE_URL, setOnUnauthorized } from '../api/client'
import type { RelationshipResponse } from '../types/social'
import type { PublicProfile} from '../types/user'
import { describe, it, expect, vi } from 'vitest'
import { server } from './server'
import { http, HttpResponse } from 'msw'
import { renderHook, waitFor } from '@testing-library/react'
import { authWrapper, makeAuthValue } from './renderWithAuth'
import { usePublicProfile } from '../users/usePublicProfile'

const PUBLIC_PROFILE_URL = `${API_BASE_URL}/users/:id`
const RELATIONSHIP_URL = `${API_BASE_URL}/social/relationship/:id`

function makeRelationship(overrides: Partial<RelationshipResponse> = {}): RelationshipResponse {
    return {
        liked_by_me: false,
        liked_you: false,
        connected: false,
        blocked_by_me: false,
        blocked_you: false,
        last_connection: '2026-01-01T00:00:00Z',
        is_online: false,
        ...overrides,
    }
}

function makePublicProfile(overrides: Partial<PublicProfile> = {}): PublicProfile {
    return {
        id: 5,
        username: 'bob',
        first_name: 'Bob',
        last_name: 'B',
        gender: 'male',
        sexual_preference: 'female',
        age: 30,
        bio: 'hello there',
        fame_rating: 50,
        location_label: 'Paris',
        last_connection: '2026-01-01T00:00:00Z',
        is_online: false,
        tags: [],
        photos: [],
        likes_received_count: 3,
        visitors_count: 7,
        ...overrides,
    }
}

describe('usePublicProfile', ()=>{
    it('happy path: relationship、profile、avatar', async ()=> {
        server.use(
            http.get(RELATIONSHIP_URL, ()=>HttpResponse.json(makeRelationship({liked_by_me: true}))),
            http.get(PUBLIC_PROFILE_URL, ()=>HttpResponse.json(makePublicProfile({
                photos: [
                            { id: 1, url: '/photo1.jpg', is_profile_photo: false },
                            { id: 2, url: '/photo2.jpg', is_profile_photo: true },
                        ],
                tags: [
                    {id: 1, name: "sport"},
                ]
            })))
        )

        const { result } = renderHook(
            ()=>usePublicProfile(5),
            {wrapper: authWrapper(makeAuthValue())}
        )

        expect(result.current.isLoading).toBe(true)
        await waitFor(()=> expect(result.current.isLoading).toBe(false))

        expect(result.current.relationship.liked_by_me).toBe(true)
        expect(result.current.publicProfile?.id).toBe(5)
        expect(result.current.profileAvatar).toBe('/photo2.jpg')
        expect(result.current.serverError).toBeNull()
    })

    it('getRelationship error, relationship and profile should be null', async () => {
        server.use(
            http.get(RELATIONSHIP_URL, () =>
                HttpResponse.json({ detail: 'error', code: 'SERVER_ERROR' }, { status: 500 })
            ),
            http.get(PUBLIC_PROFILE_URL, () => HttpResponse.json(makePublicProfile()))
        )

        const { result } = renderHook(() => usePublicProfile(5), {
            wrapper: authWrapper(makeAuthValue()),
        })

        await waitFor(() => expect(result.current.serverError).not.toBeNull())
        expect(result.current.relationship).toBeNull()
        expect(result.current.publicProfile).toBeNull()
    })


    it('getpublicProfile error, relationship shouldnot be null and profile should be null', async () => {
        server.use(
            http.get(RELATIONSHIP_URL, () =>
                HttpResponse.json(makeRelationship())
            ),
            http.get(PUBLIC_PROFILE_URL, () =>
                HttpResponse.json({ detail: 'error', code: 'SERVER_ERROR' }, { status: 500 }))
        )

        const { result } = renderHook(() => usePublicProfile(5), {
            wrapper: authWrapper(makeAuthValue()),
        })

        await waitFor(() => expect(result.current.serverError).not.toBeNull())
        expect(result.current.relationship).not.toBeNull()
        expect(result.current.publicProfile).toBeNull()
    })

    it('code is USER_NOT_FOUND call logout', async () => {
        server.use(
            http.get(RELATIONSHIP_URL, () =>
                HttpResponse.json({ detail: 'not found', code: 'USER_NOT_FOUND' }, { status: 401 })
            )
        )

        const logout = vi.fn()
        setOnUnauthorized(logout)
        renderHook(() => usePublicProfile(5), {
            wrapper: authWrapper(makeAuthValue()),
        })

        await waitFor(() => expect(logout).toHaveBeenCalledTimes(1))
        setOnUnauthorized(null)
    })
})
describe('usePublicProfile without a profile photo', ()=>{
    it('does keep the profile and a null avatar when the profile has no photos', async ()=> {
        server.use(
            http.get(RELATIONSHIP_URL, ()=>HttpResponse.json(makeRelationship())),
            http.get(PUBLIC_PROFILE_URL, ()=>HttpResponse.json(makePublicProfile({ photos: [] })))
        )

        const { result } = renderHook(
            ()=>usePublicProfile(5),
            {wrapper: authWrapper(makeAuthValue())}
        )

        await waitFor(()=> expect(result.current.isLoading).toBe(false))
        expect(result.current.publicProfile?.username).toBe('bob')
        expect(result.current.profileAvatar).toBeNull()
        expect(result.current.serverError).toBeNull()
    })
})
