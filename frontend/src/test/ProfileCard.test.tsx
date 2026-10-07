import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { API_BASE_URL } from '@/api/client'
import { ProfileCard } from '@/components/ProfileCard'
import type { DiscoveryProfile } from '@/types/discovery'

function makeProfile(overrides: Partial<DiscoveryProfile> = {}): DiscoveryProfile {
    return {
        id: 2,
        username: 'bob',
        first_name: 'Bob',
        last_name: 'Smith',
        age: 28,
        gender: 'male',
        fame_rating: 5,
        distance_km: null,
        common_tags_count: 0,
        location_label: 'Paris',
        liked_by_me: false,
        profile_photo_url: null,
        ...overrides,
    }
}

function renderCard(profile: DiscoveryProfile) {
    render(
        <MemoryRouter>
            <ProfileCard profile={profile} onLike={vi.fn()} onUnlike={vi.fn()} likeState={null} />
        </MemoryRouter>,
    )
}

describe('ProfileCard', () => {
    it('does show the profile photo when the user chose one', () => {
        renderCard(makeProfile({ profile_photo_url: '/uploads/bob.jpg' }))

        expect(screen.getByRole('img', { name: "Bob's profile" }))
            .toHaveAttribute('src', `${API_BASE_URL}/uploads/bob.jpg`)
    })

    it('does show the initials when the user has no profile photo', () => {
        renderCard(makeProfile())

        expect(screen.getByRole('img', { name: "Bob's profile" })).toHaveTextContent('BS')
    })
})
