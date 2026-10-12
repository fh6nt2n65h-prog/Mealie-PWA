import { useEffect } from 'react'

type WakeLockCapableNavigator = Navigator & { wakeLock?: WakeLock }

/**
 * Holds the screen awake while `active` is true. The browser drops the lock
 * whenever the tab is hidden, so it is re-requested on the way back into view
 * rather than assumed to have held. An unsupported browser, or a request the
 * device refuses, is ignored: cook mode still works, the screen just dims.
 */
export function useScreenWakeLock({ active }: { active: boolean }) {
  useEffect(() => {
    if (!active) {
      return
    }

    const wakeLock = (navigator as WakeLockCapableNavigator).wakeLock

    if (!wakeLock) {
      return
    }

    let sentinel: WakeLockSentinel | null = null
    let cancelled = false
    let pending = false

    function release(lock: WakeLockSentinel) {
      // A device may have already released it; cleanup must never reject unhandled.
      void lock.release().catch(() => {})
    }

    async function request() {
      if (cancelled || pending || document.visibilityState !== 'visible') {
        return
      }
      if (sentinel && !sentinel.released) {
        return
      }
      sentinel = null
      pending = true

      try {
        const next = await wakeLock.request('screen')
        if (cancelled || document.visibilityState !== 'visible') {
          release(next)
          return
        }

        sentinel = next
        next.addEventListener('release', () => {
          // Released sentinels cannot be reused. Do not retry here: a device
          // refusing the lock (e.g. low battery) must not cause a retry loop.
          if (sentinel === next) {
            sentinel = null
          }
        }, { once: true })
      } catch {
        // The device can refuse a lock. Retry only on a later foreground event.
      } finally {
        pending = false
      }
    }

    void request()
    document.addEventListener('visibilitychange', request)
    window.addEventListener('pageshow', request)
    window.addEventListener('focus', request)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', request)
      window.removeEventListener('pageshow', request)
      window.removeEventListener('focus', request)
      if (sentinel) {
        release(sentinel)
        sentinel = null
      }
    }
  }, [active])
}
