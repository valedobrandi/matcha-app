import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { API_BASE_URL } from '@/api/client'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { QueryWrapper } from './QueryWrapper'
import { server } from './server'

const FORGOT_URL = `${API_BASE_URL}/auth/forgot-password`

function requestResetLink() {
    render(
        <QueryWrapper>
            <MemoryRouter>
                <ForgotPasswordPage />
            </MemoryRouter>
        </QueryWrapper>,
    )
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'alice@example.test' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }))
}

describe('ForgotPasswordPage', () => {
    it('does show the message from the server when the link is requested', async () => {
        server.use(http.post(FORGOT_URL, () => HttpResponse.json({ message: 'If the email exists, a link is on its way.' })))

        requestResetLink()

        expect(await screen.findByText('If the email exists, a link is on its way.')).toBeInTheDocument()
    })

    it('does say the request failed when the server cannot be reached', async () => {
        server.use(http.post(FORGOT_URL, () => HttpResponse.error()))

        requestResetLink()

        expect(await screen.findAllByText('Request failed')).toHaveLength(2)
    })
})
