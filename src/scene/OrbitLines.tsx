import { Line } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, useState } from 'react'
import { Group, Vector3 } from 'three'
import { Body, PlanetOrbitalPeriod } from 'astronomy-engine'

import { SMALL_BODIES, elementsAt } from '../data/smallBodies'
import { geoMoonKm, helioPlanetKm } from '../ephemeris/ephemeris'
import { keplerOrbitPoints } from '../ephemeris/kepler'
import { PLANET_IDS, SMALL_BODY_IDS, type PlanetId, type Vec3Km } from '../ephemeris/types'
import { useSelectionStore } from '../state/selectionStore'
import { useSettingsStore } from '../state/settingsStore'
import { useTimeStore } from '../state/timeStore'
import { toSceneRelative } from '../utils/frame'
import { mapHelioToView, MOON_ORBIT_VISIBLE_SCALE, type ScaleMode } from '../utils/scale'
import { frame } from './frameState'

const PLANET_BODY: Record<PlanetId, Body> = {
  mercury: Body.Mercury,
  venus: Body.Venus,
  earth: Body.Earth,
  mars: Body.Mars,
  jupiter: Body.Jupiter,
  saturn: Body.Saturn,
  uranus: Body.Uranus,
  neptune: Body.Neptune,
}

const ZERO: Vec3Km = { x: 0, y: 0, z: 0 }
const SIDEREAL_MONTH_DAYS = 27.321661

/** One full orbit of true heliocentric samples centred on jd0 (km, doubles). */
function samplePlanetOrbitHelio(planet: PlanetId, jd0: number, n: number): Vec3Km[] {
  const period = PlanetOrbitalPeriod(PLANET_BODY[planet])
  const pts: Vec3Km[] = []
  for (let i = 0; i <= n; i++) {
    const jd = jd0 - period / 2 + (period * i) / n
    pts.push(helioPlanetKm(planet, jd, { x: 0, y: 0, z: 0 }))
  }
  return pts
}

function toScenePoints(helio: Vec3Km[], mode: ScaleMode): Vector3[] {
  const tmp: Vec3Km = { x: 0, y: 0, z: 0 }
  return helio.map((p) => toSceneRelative(mapHelioToView(p, mode, tmp), ZERO, new Vector3()))
}

const ORBIT_COLOR = '#5a6a8a'
const MOON_ORBIT_COLOR = '#4a5060'
const SMALL_BODY_ORBIT_COLOR = '#54707a'

export function OrbitLines() {
  const show = useSettingsStore((s) => s.showOrbits)
  const mode = useSettingsStore((s) => s.scaleMode)
  const groupRef = useRef<Group>(null)
  const moonGroupRef = useRef<Group>(null)
  const offset = useRef(new Vector3())

  // Sampling epochs: orbits are resampled when sim time drifts far from the
  // epoch they were sampled at (apsidal precession), throttled by real time
  // so fast playback doesn't resample every frame.
  const [planetEpochJd, setPlanetEpochJd] = useState(() => useTimeStore.getState().jd)
  const [moonEpochJd, setMoonEpochJd] = useState(() => useTimeStore.getState().jd)
  const lastRegenMs = useRef(0)

  // True heliocentric samples are mode-independent; sampled once per epoch.
  const helioSamples = useMemo(
    () =>
      PLANET_IDS.map((id) => ({
        id,
        points: samplePlanetOrbitHelio(
          id,
          planetEpochJd,
          id === 'mercury' || id === 'venus' ? 128 : 192,
        ),
      })),
    [planetEpochJd],
  )

  const planetLines = useMemo(
    () => helioSamples.map(({ id, points }) => ({ id, points: toScenePoints(points, mode) })),
    [helioSamples, mode],
  )

  // Comets + named asteroids: Kepler ellipses, resampled with planetEpochJd
  // (Halley switches element sets near its 2023 aphelion).
  const smallBodyLines = useMemo(
    () =>
      SMALL_BODY_IDS.map((id) => ({
        id,
        points: toScenePoints(
          keplerOrbitPoints(elementsAt(SMALL_BODIES[id], planetEpochJd), 220),
          mode,
        ),
      })),
    [planetEpochJd, mode],
  )

  // Moon orbit: geocentric loop, anchored to Earth's view position per frame.
  const moonPoints = useMemo(() => {
    const stretch = mode === 'visible' ? MOON_ORBIT_VISIBLE_SCALE : 1
    const pts: Vector3[] = []
    const tmp: Vec3Km = { x: 0, y: 0, z: 0 }
    for (let i = 0; i <= 96; i++) {
      const jd = moonEpochJd - SIDEREAL_MONTH_DAYS / 2 + (SIDEREAL_MONTH_DAYS * i) / 96
      geoMoonKm(jd, tmp)
      tmp.x *= stretch
      tmp.y *= stretch
      tmp.z *= stretch
      pts.push(toSceneRelative(tmp, ZERO, new Vector3()))
    }
    return pts
  }, [mode, moonEpochJd])

  useFrame(() => {
    const now = performance.now()
    if (now - lastRegenMs.current > 2000) {
      if (Math.abs(frame.jd - moonEpochJd) > 14) {
        lastRegenMs.current = now
        setMoonEpochJd(frame.jd)
      }
      if (Math.abs(frame.jd - planetEpochJd) > 3650) {
        lastRegenMs.current = now
        setPlanetEpochJd(frame.jd)
      }
    }
    const originBody = useSelectionStore.getState().originBody
    const origin = frame.view[originBody].pos
    if (groupRef.current) {
      groupRef.current.position.copy(toSceneRelative(ZERO, origin, offset.current))
    }
    if (moonGroupRef.current) {
      moonGroupRef.current.position.copy(
        toSceneRelative(frame.view.earth.pos, origin, offset.current),
      )
    }
  })

  if (!show) return null

  return (
    <>
      <group ref={groupRef}>
        {planetLines.map(({ id, points }) => (
          <Line
            key={`${id}-${mode}`}
            points={points}
            color={ORBIT_COLOR}
            lineWidth={1}
            transparent
            opacity={0.4}
          />
        ))}
        {smallBodyLines.map(({ id, points }) => (
          <Line
            key={`${id}-${mode}`}
            points={points}
            color={SMALL_BODY_ORBIT_COLOR}
            lineWidth={1}
            transparent
            opacity={0.28}
          />
        ))}
      </group>
      <group ref={moonGroupRef}>
        <Line
          key={mode}
          points={moonPoints}
          color={MOON_ORBIT_COLOR}
          lineWidth={1}
          transparent
          opacity={0.4}
        />
      </group>
    </>
  )
}
