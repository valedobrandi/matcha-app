import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { API_BASE_URL } from '@/api/client'
import { ResendVerificationPage } from '@/pages/auth/ResendVerificationPage'
import { QueryWrapper } from './QueryWrapper'
import { server } from './server'

const RESEND_URL = `${API_BASE_URL}/auth/resend-verification`

function resendEmail() {
    render(
        <QueryWrapper>
            <MemoryRouter>
                <ResendVerificationPage />
            </MemoryRouter>
        </QueryWrapper>,
    )
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'alice@example.test' } })
    fireEvent.click(screen.getByRole('button', { name: 'Resend email' }))
}

describe('ResendVerificationPage', () => {
    it('does show the message from the server when the email is sent again', async () => {
        server.use(http.post(RESEND_URL, () => HttpResponse.json({ message: 'A new verification email is on its way.' })))

        resendEmail()

        expect(await screen.findByText('A new verification email is on its way.')).toBeInTheDocument()
    })

    it('does say the request failed when the server cannot be reached', async () => {
        server.use(http.post(RESEND_URL, () => HttpResponse.error()))

        resendEmail()

        expect(await screen.findAllByText('Request failed')).toHaveLength(2)
    })
})
