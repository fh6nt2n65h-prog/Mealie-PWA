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

    function request() {
      if (cancelled || sentinel || document.visibilityState !== 'visible') {
        return
      }

      wakeLock.request('screen').then(
        (next) => {
          if (cancelled) {
            next.release()
            return
          }

          sentinel = next
        },
        () => {
          // Refused by the browser or the device: nothing to recover from.
        }
      )
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        request()
      }
    }

    request()
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      sentinel?.release()
      sentinel = null
    }
  }, [active])
}
