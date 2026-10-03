import { describe, it, expect, vi, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { useInfiniteScroll } from '../hooks/useInfiniteScroll'

type ObserverCallback = (entries: Array<{ isIntersecting: boolean }>) => void

function Probe({ loadMore }: { loadMore: () => void }) {
    const sentinelRef = useInfiniteScroll(loadMore)
    return <div ref={sentinelRef} data-testid="sentinel" />
}

describe('useInfiniteScroll', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('does call the latest loadMore when the sentinel intersects after a rerender', () => {
        let notify: ObserverCallback = () => {}
        class FakeIntersectionObserver {
            constructor(callback: ObserverCallback) { notify = callback }
            observe() {}
            disconnect() {}
        }
        vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver)
        const first = vi.fn()
        const second = vi.fn()

        const { rerender } = render(<Probe loadMore={first} />)
        rerender(<Probe loadMore={second} />)
        notify([{ isIntersecting: true }])

        expect(second).toHaveBeenCalledTimes(1)
        expect(first).not.toHaveBeenCalled()
    })

    it('does not call loadMore when the sentinel is not intersecting', () => {
        let notify: ObserverCallback = () => {}
        class FakeIntersectionObserver {
            constructor(callback: ObserverCallback) { notify = callback }
            observe() {}
            disconnect() {}
        }
        vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver)
        const loadMore = vi.fn()

        render(<Probe loadMore={loadMore} />)
        notify([{ isIntersecting: false }])

        expect(loadMore).not.toHaveBeenCalled()
    })
})
