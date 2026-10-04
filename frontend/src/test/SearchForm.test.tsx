import { describe, it, expect } from 'vitest'
import { http, HttpResponse } from 'msw'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { server } from './server'
import { authWrapper, makeAuthValue } from './renderWithAuth'
import { API_BASE_URL } from '../api/client'
import { SearchForm } from '../components/ui/search-form'

const SEARCH_URL = `${API_BASE_URL}/discovery/search-list`

function renderSearchForm() {
  const Wrapper = authWrapper(makeAuthValue())
  return render(
    <Wrapper>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<SearchForm />} />
          <Route path="/users/:userId" element={<p>profile page</p>} />
        </Routes>
      </MemoryRouter>
    </Wrapper>,
  )
}

function type(value: string) {
  fireEvent.change(screen.getByRole('textbox'), { target: { value } })
}

describe('SearchForm', () => {
  it('does keep what the user typed when the text is one character', () => {
    renderSearchForm()

    type('a')

    expect(screen.getByRole('textbox')).toHaveValue('a')
  })

  it('does not ask the API when the text is shorter than two characters', async () => {
    const targets: Array<string | null> = []
    server.use(
      http.get(SEARCH_URL, ({ request }) => {
        targets.push(new URL(request.url).searchParams.get('target'))
        return HttpResponse.json([])
      }),
    )
    renderSearchForm()

    type('a')
    await new Promise((resolve) => setTimeout(resolve, 450))

    expect(targets).toEqual([])
  })

  it('does show the matching profiles and open the profile page when a result is chosen', async () => {
    server.use(
      http.get(SEARCH_URL, ({ request }) => {
        expect(new URL(request.url).searchParams.get('target')).toBe('bo')
        return HttpResponse.json([{ id: 7, username: 'bob', first_name: 'Bob', last_name: 'B' }])
      }),
    )
    renderSearchForm()

    type('bo')
    fireEvent.click(await screen.findByText(/Bob B \(bob\)/))

    expect(await screen.findByText('profile page')).toBeInTheDocument()
  })

  it('does show a not-found message when the API returns no profile', async () => {
    server.use(http.get(SEARCH_URL, () => HttpResponse.json([])))
    renderSearchForm()

    type('zz')

    expect(await screen.findByText('User is not exists.')).toBeInTheDocument()
  })
})
