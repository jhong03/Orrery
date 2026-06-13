import type { CometId } from '../data/smallBodies'
import { computeSystemState } from '../ephemeris/ephemeris'
import type { EclipseEvent } from '../ephemeris/events'
import { bodyAxesEcl, createBodyAxes } from '../ephemeris/rotation'
import { createSystemState, type BodyId } from '../ephemeris/types'
import { useSelectionStore } from '../state/selectionStore'
import { useSurfaceStore } from '../state/surfaceStore'
import { useTimeStore } from '../state/timeStore'

const DEG = 180 / Math.PI
const scratch = createSystemState()
const scratchAxes = createBodyAxes()

/** Geographic point where `body` is at the zenith at the given instant. */
function subBodyPoint(body: BodyId, jd: number): { latDeg: number; lonDeg: number } {
  computeSystemState(jd, scratch)
  bodyAxesEcl('earth', jd, scratchAxes)
  const dx = scratch[body].x - scratch.earth.x
  const dy = scratch[body].y - scratch.earth.y
  const dz = scratch[body].z - scratch.earth.z
  const r = Math.hypot(dx, dy, dz)
  const ux = dx / r
  const uy = dy / r
  const uz = dz / r
  const bx = ux * scratchAxes.xAxis.x + uy * scratchAxes.xAxis.y + uz * scratchAxes.xAxis.z
  const by = ux * scratchAxes.yAxis.x + uy * scratchAxes.yAxis.y + uz * scratchAxes.yAxis.z
  const bz = ux * scratchAxes.zAxis.x + uy * scratchAxes.zAxis.y + uz * scratchAxes.zAxis.z
  return {
    latDeg: Math.asin(Math.max(-1, Math.min(1, bz))) * DEG,
    lonDeg: Math.atan2(by, bx) * DEG,
  }
}

/** Sets time to an eclipse peak and presents it: sunlit side, slow playback. */
export function jumpToEclipse(e: EclipseEvent) {
  const time = useTimeStore.getState()
  time.setJd(e.peakJd)
  time.setPlaying(true)
  useTimeStore.setState({ speedIndex: 2, direction: 1 }) // 10 min/s
  // Solar: watch the umbra spot crawl across Earth. Lunar: watch the Moon redden.
  useSelectionStore.getState().focusBody(e.type === 'solar' ? 'earth' : 'moon')
}

export function jumpToPerihelion(id: CometId, tp: number) {
  const time = useTimeStore.getState()
  time.setJd(tp - 20) // arrive shortly before peak activity
  time.setPlaying(true)
  useTimeStore.setState({ speedIndex: 5, direction: 1 }) // 1 day/s
  useSelectionStore.getState().focusBody(id)
}

/**
 * Drop the viewer onto Earth's surface to witness an eclipse first-hand:
 * for a solar eclipse, on the greatest-eclipse centreline looking at the Sun
 * (totality darkens the sky around them); for a lunar eclipse, at the point
 * where the Moon is overhead, looking at the reddened disc. Time is set to the
 * peak and paused so the moment holds.
 */
export function watchEclipseFromGround(e: EclipseEvent) {
  useTimeStore.getState().setJd(e.peakJd)
  useTimeStore.getState().setPlaying(false)
  if (e.type === 'solar' && e.latitude !== undefined && e.longitude !== undefined) {
    useSurfaceStore
      .getState()
      .enter(e.latitude, e.longitude, { placeName: 'Greatest eclipse', lookAt: 'sun' })
  } else {
    const p = subBodyPoint('moon', e.peakJd)
    useSurfaceStore
      .getState()
      .enter(p.latDeg, p.lonDeg, { placeName: 'Moonlit side', lookAt: 'moon' })
  }
}

export function eclipseTitle(e: EclipseEvent): string {
  const kind = e.kind[0].toUpperCase() + e.kind.slice(1)
  return e.type === 'solar' ? `${kind} solar eclipse` : `${kind} lunar eclipse`
}
