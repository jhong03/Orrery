import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { MakeTime, RotateVector, Rotation_EQJ_ECL, Vector } from 'astronomy-engine'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Vector3,
  type LineSegments,
} from 'three'

import { isShowerActive, METEOR_SHOWERS, type MeteorShower } from '../../data/meteorShowers'
import { createEnuBasis, eclToEnu, enuBasisEcl } from '../../ephemeris/topocentric'
import { jdToDate } from '../../ephemeris/time'
import type { Vec3Km } from '../../ephemeris/types'
import { useSurfaceStore } from '../../state/surfaceStore'
import { frame } from '../frameState'
import { surfaceEvents } from './surfaceEvents'

const POOL = 28
const RADIUS = 1e6 // in front of the sky dome (9e6), so visible at night
const EQJ_ECL = Rotation_EQJ_ECL()
const EPOCH = MakeTime(0)

interface Streak {
  active: boolean
  born: number
  life: number
  head: Vector3
  dir: Vector3 // unit, away from the radiant
  len: number
}

/** Radiant J2000 RA/Dec -> ecliptic unit vector (constant per shower). */
function radiantEcl(s: MeteorShower): Vec3Km {
  const ra = (s.radiantRaDeg * Math.PI) / 180
  const dec = (s.radiantDecDeg * Math.PI) / 180
  const eqj = new Vector(
    Math.cos(dec) * Math.cos(ra),
    Math.cos(dec) * Math.sin(ra),
    Math.sin(dec),
    EPOCH,
  )
  const e = RotateVector(EQJ_ECL, eqj)
  return { x: e.x, y: e.y, z: e.z }
}

/**
 * Shooting stars during an active meteor shower: short streaks that all trace
 * back to the shower's radiant. Spawned on real wall-clock time (so the rate
 * looks right regardless of sim speed), gated on night + radiant above the
 * horizon, and rate-scaled by the shower's ZHR.
 */
export function Meteors() {
  const ref = useRef<LineSegments>(null)
  const streaks = useRef<Streak[]>(
    Array.from({ length: POOL }, () => ({
      active: false,
      born: 0,
      life: 1,
      head: new Vector3(),
      dir: new Vector3(),
      len: 0,
    })),
  )
  const lastSpawn = useRef(0)
  const seed = useRef(987654321)
  const tmp = useRef({
    basis: createEnuBasis(),
    rad: new Vector3(),
    p: new Vector3(),
    t: new Vector3(),
    enu: { x: 0, y: 0, z: 0 } as Vec3Km,
  })

  const geo = useMemo(() => {
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(new Float32Array(POOL * 2 * 3), 3))
    g.setAttribute('color', new BufferAttribute(new Float32Array(POOL * 2 * 3), 3))
    g.boundingSphere = null
    return g
  }, [])

  const rand = () => {
    let s = seed.current
    s = (s * 48271) % 2147483647
    seed.current = s
    return s / 2147483647
  }

  useFrame((state) => {
    const now = state.clock.elapsedTime
    const t = tmp.current
    const { latDeg, lonDeg } = useSurfaceStore.getState()

    // Active shower for the current sim date (first match wins).
    const date = jdToDate(frame.jd)
    const shower = METEOR_SHOWERS.find((s) =>
      isShowerActive(s, date.getUTCMonth() + 1, date.getUTCDate()),
    )

    enuBasisEcl(latDeg, lonDeg, frame.axes.earth, t.basis)

    // Night factor from the Sun's altitude (meteors only show in the dark).
    const sd = frame.sys.sun
    const se = frame.sys.earth
    const sunUp =
      ((sd.x - se.x) * t.basis.up.x + (sd.y - se.y) * t.basis.up.y + (sd.z - se.z) * t.basis.up.z) /
      Math.hypot(sd.x - se.x, sd.y - se.y, sd.z - se.z)
    const night = 1 - Math.min(1, Math.max(0, (sunUp + 0.05) / 0.12))

    // Radiant direction in the surface three-frame (x east, y up, -z north).
    let radiantUp = -1
    if (shower) {
      const ecl = radiantEcl(shower)
      eclToEnu(ecl, t.basis, t.enu)
      const l = Math.hypot(t.enu.x, t.enu.y, t.enu.z)
      t.rad.set(t.enu.x / l, t.enu.z / l, -t.enu.y / l)
      radiantUp = t.rad.y
    }

    // Spawn rate scaled by ZHR; only when it's dark, the radiant is up, and
    // no eclipse is washing the sky.
    const canShow = shower && night > 0.6 && radiantUp > 0.05 && surfaceEvents.solarOcclusion < 0.1
    if (canShow) {
      const perSec = (shower!.zhr / 120) * Math.min(1, radiantUp + 0.3)
      if (now - lastSpawn.current > 1 / Math.max(0.05, perSec)) {
        lastSpawn.current = now
        const s = streaks.current.find((x) => !x.active)
        if (s) {
          // Random sky point 12..75 deg from the radiant.
          const ang = (12 + rand() * 63) * (Math.PI / 180)
          const az = rand() * Math.PI * 2
          // Build a vector at angle `ang` from the radiant.
          const up = Math.abs(t.rad.y) < 0.9 ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0)
          const e1 = new Vector3().crossVectors(t.rad, up).normalize()
          const e2 = new Vector3().crossVectors(t.rad, e1)
          t.p
            .copy(t.rad)
            .multiplyScalar(Math.cos(ang))
            .addScaledVector(e1, Math.sin(ang) * Math.cos(az))
            .addScaledVector(e2, Math.sin(ang) * Math.sin(az))
            .normalize()
          // Direction away from the radiant (tangent at p).
          t.t.copy(t.p).addScaledVector(t.rad, -t.p.dot(t.rad)).normalize()
          if (t.p.y > 0.02) {
            s.active = true
            s.born = now
            s.life = 0.45 + rand() * 0.5
            s.head.copy(t.p)
            s.dir.copy(t.t)
            s.len = 0.04 + rand() * 0.08 // radians of arc
          }
        }
      }
    }

    // Update geometry.
    const pos = geo.getAttribute('position') as BufferAttribute
    const col = geo.getAttribute('color') as BufferAttribute
    streaks.current.forEach((s, i) => {
      const i0 = i * 2
      if (!s.active) {
        pos.setXYZ(i0, 0, 0, 0)
        pos.setXYZ(i0 + 1, 0, 0, 0)
        col.setXYZ(i0, 0, 0, 0)
        col.setXYZ(i0 + 1, 0, 0, 0)
        return
      }
      const age = (now - s.born) / s.life
      if (age >= 1) {
        s.active = false
        return
      }
      // Head slides along the streak direction; brightness peaks mid-life.
      const slide = age * s.len * 2.0
      const headDir = t.p.copy(s.head).addScaledVector(s.dir, slide).normalize()
      const tailDir = t.t.copy(headDir).addScaledVector(s.dir, -s.len).normalize()
      const bright = Math.sin(Math.min(1, age) * Math.PI) * night
      pos.setXYZ(i0, headDir.x * RADIUS, headDir.y * RADIUS, headDir.z * RADIUS)
      pos.setXYZ(i0 + 1, tailDir.x * RADIUS, tailDir.y * RADIUS, tailDir.z * RADIUS)
      col.setXYZ(i0, bright, bright, bright * 0.95)
      col.setXYZ(i0 + 1, 0, 0, 0) // tail fades to nothing
    })
    pos.needsUpdate = true
    col.needsUpdate = true
    if (ref.current) ref.current.visible = true
  })

  return (
    <lineSegments ref={ref} geometry={geo} renderOrder={-47}>
      <lineBasicMaterial vertexColors transparent depthWrite={false} blending={AdditiveBlending} />
    </lineSegments>
  )
}
