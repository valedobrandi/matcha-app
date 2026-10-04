import { describe, it, expect, afterEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useIsMobile } from '../hooks/use-mobile'

// The browser is the true boundary here: matchMedia and the viewport width.
function stubViewport(width: number) {
  let listener: (() => void) | null = null
  const apply = (next: number) => {
    Object.defineProperty(window, 'innerWidth', { value: next, configurable: true, writable: true })
  }
  apply(width)
  window.matchMedia = ((query: string) => ({
    get matches() {
      const max = Number(/max-width:\s*(\d+)px/.exec(query)?.[1])
      return window.innerWidth <= max
    },
    media: query,
    addEventListener: (_: string, callback: () => void) => {
      listener = callback
    },
    removeEventListener: () => {
      listener = null
    },
  })) as unknown as typeof window.matchMedia
  return {
    resize(next: number) {
      apply(next)
      act(() => listener?.())
    },
  }
}

describe('useIsMobile', () => {
  const originalWidth = window.innerWidth
  const originalMatchMedia = window.matchMedia

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', { value: originalWidth, configurable: true, writable: true })
    window.matchMedia = originalMatchMedia
  })

  it('does report mobile when the viewport is narrower than 768 px', () => {
    stubViewport(500)

    const { result } = renderHook(() => useIsMobile())

    expect(result.current).toBe(true)
  })

  it('does report desktop when the viewport is 768 px or wider', () => {
    stubViewport(768)

    const { result } = renderHook(() => useIsMobile())

    expect(result.current).toBe(false)
  })

  it('does follow the viewport when it is resized across the breakpoint', () => {
    const viewport = stubViewport(1200)
    const { result } = renderHook(() => useIsMobile())

    viewport.resize(400)

    expect(result.current).toBe(true)
  })
})
