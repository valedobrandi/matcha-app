import { describe, it, expect } from 'vitest'
import { http, HttpResponse } from 'msw'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { server, sampleProfile } from './server'
import { authWrapper, makeAuthValue } from './renderWithAuth'
import { API_BASE_URL } from '../api/client'
import MyProfilePage from '../pages/profile/MyProfilePage'

describe('MyProfilePage popularity', () => {
    it('does show the fame rating from the API when the profile loads', async () => {
        server.use(
            http.get(`${API_BASE_URL}/users/me`, () => HttpResponse.json({ ...sampleProfile, fame_rating: 37 })),
            http.get(`${API_BASE_URL}/users/me/photos`, () => HttpResponse.json([])),
            http.get(`${API_BASE_URL}/users/me/tags`, () => HttpResponse.json([])),
        )
        const Wrapper = authWrapper(makeAuthValue())
        render(<Wrapper><MemoryRouter><MyProfilePage /></MemoryRouter></Wrapper>)

        expect(await screen.findByText('37')).toBeInTheDocument()
    })
})
