import { describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { API_BASE_URL } from '@/api/client'
import LocationForm from '@/components/location-form'
import useLocationForm from '@/users/useLocationForm'
import { authWrapper, makeAuthValue } from './renderWithAuth'
import { sampleProfile, server } from './server'

const NOMINATIM_SEARCH = 'https://nominatim.openstreetmap.org/search'

function LocationStep({ onSuccess }: { onSuccess: () => void }) {
    const location = useLocationForm(onSuccess)
    return <LocationForm {...location} />
}

function renderLocationStep(onSuccess = vi.fn()) {
    const Wrapper = authWrapper(makeAuthValue())
    render(<Wrapper><LocationStep onSuccess={onSuccess} /></Wrapper>)
    return onSuccess
}

describe('LocationForm with useLocationForm', () => {
    it('does save the city typed by hand when the user does not share the position', async () => {
        const sentLocations: unknown[] = []
        server.use(
            http.get(NOMINATIM_SEARCH, () => HttpResponse.json([{ lat: '45.7578137', lon: '4.8320114' }])),
            http.patch(`${API_BASE_URL}/users/me/location`, async ({ request }) => {
                sentLocations.push(await request.json())
                return HttpResponse.json(sampleProfile)
            }),
        )
        const onSuccess = renderLocationStep()
        const city = screen.getByLabelText('City or neighborhood')

        fireEvent.change(city, { target: { value: 'Lyon' } })
        fireEvent.blur(city)
        expect(await screen.findByText('Your location: Lyon')).toBeInTheDocument()
        fireEvent.click(screen.getByRole('button', { name: 'Next' }))

        await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1))
        expect(sentLocations).toEqual([{ latitude: 45.7578137, longitude: 4.8320114, location_label: 'Lyon', location_consent: false }])
    })

    it('does ask for the location and not go on when none is given', async () => {
        const onSuccess = renderLocationStep()

        fireEvent.click(screen.getByRole('button', { name: 'Next' }))

        expect(await screen.findByText('Please enter your location manually or enable location sharing.')).toBeInTheDocument()
        expect(onSuccess).not.toHaveBeenCalled()
    })
})
