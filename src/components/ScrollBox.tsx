import { useEffect, useLayoutEffect, useRef, useState } from 'react'

interface Props {
  children: React.ReactNode
}

/**
 * Scroll container with a custom always-visible thumb. The native scrollbar is
 * hidden because iOS Safari renders it light/overlay and ignores CSS styling;
 * this draws our own dark thumb that looks identical on every platform.
 */
export default function ScrollBox({ children }: Props) {
  const scroller = useRef<HTMLDivElement>(null)
  const [thumb, setThumb] = useState({ height: 0, top: 0 })

  function update() {
    const el = scroller.current
    if (!el) return
    const { scrollHeight, clientHeight, scrollTop } = el
    if (scrollHeight <= clientHeight + 1) {
      // fits — show a full-height thumb so the bar is always visible
      setThumb({ height: clientHeight, top: 0 })
      return
    }
    const h = Math.max(40, (clientHeight / scrollHeight) * clientHeight)
    const maxTop = clientHeight - h
    const top = (scrollTop / (scrollHeight - clientHeight)) * maxTop
    setThumb({ height: h, top })
  }

  useLayoutEffect(update, [])

  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const ro = new ResizeObserver(update)
    ro.observe(el)
    const mo = new MutationObserver(update)
    mo.observe(el, { childList: true, subtree: true })
    return () => {
      ro.disconnect()
      mo.disconnect()
    }
  }, [])

  return (
    <div className="scrollbox">
      <div className="scrollbox-scroller" ref={scroller} onScroll={update}>
        {children}
      </div>
      <div
        className="scrollbox-thumb"
        style={{ height: thumb.height, transform: `translateY(${thumb.top}px)` }}
      />
    </div>
  )
}
