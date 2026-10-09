import { describe, expect, it, vi } from 'vitest'
import { delay, http, HttpResponse } from 'msw'
import { fireEvent, render, screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react'
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

    it('does forget the found city and not go on when the typed location changes after the lookup', async () => {
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
        await screen.findByText('Your location: Lyon')

        fireEvent.change(city, { target: { value: 'Paris' } })

        expect(screen.queryByText(/^Your location:/)).not.toBeInTheDocument()
        fireEvent.click(screen.getByRole('button', { name: 'Next' }))
        expect(await screen.findByText('Please enter your location manually or enable location sharing.')).toBeInTheDocument()
        expect(onSuccess).not.toHaveBeenCalled()
        expect(sentLocations).toEqual([])
    })

    it('does keep Next disabled while the typed location is looked up', async () => {
        let releaseGeocoding = () => {}
        const geocoding = new Promise<void>(resolve => { releaseGeocoding = resolve })
        server.use(http.get(NOMINATIM_SEARCH, async () => {
            await geocoding
            return HttpResponse.json([{ lat: '45.7578137', lon: '4.8320114' }])
        }))
        renderLocationStep()
        const city = screen.getByLabelText('City or neighborhood')

        fireEvent.change(city, { target: { value: 'Lyon' } })
        fireEvent.blur(city)

        expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
        releaseGeocoding()
        expect(await screen.findByText('Your location: Lyon')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled()
    })

    it('does drop the lookup of the previous text when the typed location changes', async () => {
        server.use(http.get(NOMINATIM_SEARCH, () => delay('infinite')))
        renderLocationStep()
        const city = screen.getByLabelText('City or neighborhood')
        fireEvent.change(city, { target: { value: 'Lyon' } })
        fireEvent.blur(city)
        const locating = screen.getByText('Getting your location...')

        fireEvent.change(city, { target: { value: 'Paris' } })

        await waitForElementToBeRemoved(locating)
        expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled()
    })

    it('does clear the missing-location error once a typed location is found', async () => {
        server.use(http.get(NOMINATIM_SEARCH, () => HttpResponse.json([{ lat: '45.7578137', lon: '4.8320114' }])))
        renderLocationStep()
        fireEvent.click(screen.getByRole('button', { name: 'Next' }))
        await screen.findByText('Please enter your location manually or enable location sharing.')
        const city = screen.getByLabelText('City or neighborhood')

        fireEvent.change(city, { target: { value: 'Lyon' } })
        fireEvent.blur(city)

        expect(await screen.findByText('Your location: Lyon')).toBeInTheDocument()
        expect(screen.queryByText('Please enter your location manually or enable location sharing.')).not.toBeInTheDocument()
    })

    it('does ask for the location and not go on when none is given', async () => {
        const onSuccess = renderLocationStep()

        fireEvent.click(screen.getByRole('button', { name: 'Next' }))

        expect(await screen.findByText('Please enter your location manually or enable location sharing.')).toBeInTheDocument()
        expect(onSuccess).not.toHaveBeenCalled()
    })
})
