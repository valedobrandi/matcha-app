import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { API_BASE_URL } from '@/api/client'
import AdvancedSearchForm, { type AdvancedFilters } from '@/components/AdvancedSearchForm'
import { authWrapper, makeAuthValue } from './renderWithAuth'
import { server } from './server'

const FILTERS: AdvancedFilters = { ageRange: [18, 65], fameRange: [0, 100], maxDistance: [20], tagIds: [] }
const CONTROL_RECT = { left: 0, right: 100, width: 100, top: 0, bottom: 10, height: 10, x: 0, y: 0 } as DOMRect

function renderForm(onChange = vi.fn()) {
    const Wrapper = authWrapper(makeAuthValue())
    render(<Wrapper><AdvancedSearchForm value={FILTERS} onChange={onChange} /></Wrapper>)
    return onChange
}

function ageSliderControl() {
    const control = screen.getAllByRole('group')[0].firstElementChild as HTMLElement
    vi.spyOn(control, 'getBoundingClientRect').mockReturnValue(CONTROL_RECT)
    return control
}

class PointerEventWithCoordinates extends MouseEvent {
    pointerId = 0
    pointerType = 'mouse'
}

beforeEach(() => {
    vi.stubGlobal('PointerEvent', PointerEventWithCoordinates)
    Object.defineProperty(HTMLElement.prototype, 'hasPointerCapture', { value: () => false, configurable: true })
    Object.defineProperty(HTMLElement.prototype, 'releasePointerCapture', { value: () => {}, configurable: true })
})

afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
})

describe('AdvancedSearchForm', () => {
    it('does move the age label with the thumb and commit the filters once, when the drag ends', async () => {
        const onChange = renderForm()
        const control = ageSliderControl()

        fireEvent.pointerDown(control, { button: 0, clientX: 50, clientY: 5 })
        for (const clientX of [55, 60, 65, 70])
            fireEvent.pointerMove(document, { buttons: 1, clientX, clientY: 5 })

        expect(await screen.findByText('18, 75')).toBeInTheDocument()
        expect(onChange).not.toHaveBeenCalled()

        fireEvent.pointerUp(document, { clientX: 70, clientY: 5 })

        expect(onChange).toHaveBeenCalledTimes(1)
        expect(onChange).toHaveBeenCalledWith({ ...FILTERS, ageRange: [18, 75] })
    })

    it('does search tags without loading the signed-in user\'s own tags', async () => {
        let ownTagRequests = 0
        server.use(
            http.get(`${API_BASE_URL}/users/me/tags`, () => {
                ownTagRequests += 1
                return HttpResponse.json([])
            }),
            http.get(`${API_BASE_URL}/tags`, () => HttpResponse.json([{ id: 3, name: 'geek' }])),
        )
        const onChange = renderForm()

        fireEvent.change(screen.getByPlaceholderText('Searching commun tags...'), { target: { value: 'ge' } })
        fireEvent.click(await screen.findByRole('button', { name: 'geek' }))

        expect(onChange).toHaveBeenCalledWith({ ...FILTERS, tagIds: [3] })
        expect(ownTagRequests).toBe(0)
    })

    it('does show the server message and clear the search when a tag search is refused', async () => {
        server.use(http.get(`${API_BASE_URL}/tags`, () => HttpResponse.json(
            { detail: 'Your tag contains profanity content.', code: 'TAG_CONTENT_PROFANITY' },
            { status: 400 },
        )))
        renderForm()
        const search = screen.getByPlaceholderText('Searching commun tags...')

        fireEvent.change(search, { target: { value: 'badword' } })

        expect(await screen.findByText('Your tag contains profanity content.')).toBeInTheDocument()
        await waitFor(() => expect(search).toHaveValue(''))
    })
})
