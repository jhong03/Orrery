import type { CometId } from '../data/smallBodies'
import type { EclipseEvent } from '../ephemeris/events'
import { useSelectionStore } from '../state/selectionStore'
import { useTimeStore } from '../state/timeStore'

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

export function eclipseTitle(e: EclipseEvent): string {
  const kind = e.kind[0].toUpperCase() + e.kind.slice(1)
  return e.type === 'solar' ? `${kind} solar eclipse` : `${kind} lunar eclipse`
}
