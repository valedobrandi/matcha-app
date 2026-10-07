import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { API_BASE_URL } from '@/api/client'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { QueryWrapper } from './QueryWrapper'
import { server } from './server'

const REGISTER_URL = `${API_BASE_URL}/auth/register`

function renderRegister() {
    render(
        <QueryWrapper>
            <MemoryRouter>
                <RegisterPage />
            </MemoryRouter>
        </QueryWrapper>,
    )
}

function submitAccount() {
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'alice@example.test' } })
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'alice' } })
    fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'Alice' } })
    fireEvent.change(screen.getByLabelText('Last name'), { target: { value: 'Smith' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Secret123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
}

describe('RegisterPage', () => {
    it('does show the message from the server when the account is created', async () => {
        server.use(http.post(REGISTER_URL, () => HttpResponse.json({ message: 'Check your inbox to verify your email.' })))

        renderRegister()
        submitAccount()

        expect(await screen.findByText('Check your inbox to verify your email.')).toBeInTheDocument()
    })

    it('does mark the username field when the username is taken', async () => {
        server.use(http.post(REGISTER_URL, () => HttpResponse.json(
            { detail: 'Username taken', code: 'USERNAME_TAKEN', field: 'username' },
            { status: 409 },
        )))

        renderRegister()
        submitAccount()

        expect(await screen.findByText('This username is already taken.')).toBeInTheDocument()
        expect(screen.getByLabelText('Username')).toHaveAttribute('aria-invalid', 'true')
    })

    it('does say the registration failed when the server cannot be reached', async () => {
        server.use(http.post(REGISTER_URL, () => HttpResponse.error()))

        renderRegister()
        submitAccount()

        expect(await screen.findAllByText('Registration failed')).toHaveLength(2)
    })
})
