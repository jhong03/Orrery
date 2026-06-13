import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'

import { useTimeStore } from '../state/timeStore'

/** Full two-finger width sweep = one year, matching the HUD timeline. */
const SCRUB_RANGE_DAYS = 365

/** Cumulative pixels before a two-finger gesture is classified. */
const CLASSIFY_PX = 18

type Mode = 'undecided' | 'scrub' | 'zoom'

/**
 * Mobile gesture layer: a two-finger HORIZONTAL drag scrubs simulation time
 * (one year across the screen). Pinches and vertical two-finger moves are
 * left to OrbitControls (dolly). One finger always orbits.
 *
 * Classification: once the gesture has moved ~18 px, compare how far the
 * midpoint travelled horizontally with how much the finger spread changed —
 * parallel horizontal motion is a scrub, diverging fingers are a pinch.
 */
export function TouchTimeScrub() {
  const gl = useThree((s) => s.gl)
  const get = useThree((s) => s.get)

  useEffect(() => {
    const el = gl.domElement
    const touches = new Map<number, { x: number; y: number }>()
    const g = {
      mode: 'undecided' as Mode,
      startMidX: 0,
      startMidY: 0,
      startSpread: 0,
      startJd: 0,
      wasPlaying: false,
    }

    const spread = () => {
      const [a, b] = [...touches.values()]
      return Math.hypot(a.x - b.x, a.y - b.y)
    }
    const midpoint = () => {
      const [a, b] = [...touches.values()]
      return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
    }

    const endScrub = () => {
      if (g.mode === 'scrub') {
        const controls = get().controls as OrbitControlsImpl | null
        if (controls) controls.enabled = true
        if (g.wasPlaying) useTimeStore.getState().setPlaying(true)
      }
      g.mode = 'undecided'
    }

    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (touches.size === 2) {
        const m = midpoint()
        g.mode = 'undecided'
        g.startMidX = m.x
        g.startMidY = m.y
        g.startSpread = spread()
        const time = useTimeStore.getState()
        g.startJd = time.jd
        g.wasPlaying = time.playing
      }
    }

    const onMove = (e: PointerEvent) => {
      if (!touches.has(e.pointerId)) return
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (touches.size !== 2 || g.mode === 'zoom') return

      const m = midpoint()
      const dMidX = m.x - g.startMidX
      const dMidY = m.y - g.startMidY
      const dSpread = spread() - g.startSpread

      if (g.mode === 'undecided') {
        const travel = Math.max(Math.abs(dMidX), Math.abs(dMidY), Math.abs(dSpread))
        if (travel < CLASSIFY_PX) return
        if (Math.abs(dMidX) > Math.abs(dSpread) && Math.abs(dMidX) > Math.abs(dMidY) * 1.2) {
          g.mode = 'scrub'
          const controls = get().controls as OrbitControlsImpl | null
          if (controls) controls.enabled = false
          useTimeStore.getState().setPlaying(false)
          // Re-baseline so time doesn't jump by the classification distance.
          g.startMidX = m.x
        } else {
          g.mode = 'zoom'
          return
        }
      }

      const days = ((m.x - g.startMidX) / el.clientWidth) * SCRUB_RANGE_DAYS
      useTimeStore.getState().setJd(g.startJd + days)
    }

    const onUp = (e: PointerEvent) => {
      if (!touches.delete(e.pointerId)) return
      if (touches.size < 2) endScrub()
    }

    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
    return () => {
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
    }
  }, [gl, get])

  return null
}
