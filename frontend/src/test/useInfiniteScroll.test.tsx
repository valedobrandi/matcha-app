import { describe, it, expect, vi, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { useInfiniteScroll } from '../hooks/useInfiniteScroll'

type ObserverCallback = (entries: Array<{ isIntersecting: boolean }>) => void

function Probe({ loadMore, isLoading = false }: { loadMore: () => void, isLoading?: boolean }) {
    const sentinelRef = useInfiniteScroll(loadMore, isLoading)
    return <div ref={sentinelRef} data-testid="sentinel" />
}

class InViewObserver {
    callback: ObserverCallback
    constructor(callback: ObserverCallback) { this.callback = callback }
    observe() { this.callback([{ isIntersecting: true }]) }
    disconnect() {}
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

    it('does check the sentinel again when a load finishes', () => {
        vi.stubGlobal('IntersectionObserver', InViewObserver)
        const loadMore = vi.fn()

        const { rerender } = render(<Probe loadMore={loadMore} />)
        rerender(<Probe loadMore={loadMore} isLoading />)
        rerender(<Probe loadMore={loadMore} />)

        expect(loadMore).toHaveBeenCalledTimes(2)
    })

    it('does not watch the sentinel while a load is running', () => {
        vi.stubGlobal('IntersectionObserver', InViewObserver)
        const loadMore = vi.fn()

        render(<Probe loadMore={loadMore} isLoading />)

        expect(loadMore).not.toHaveBeenCalled()
    })
})
