import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { CylinderGeometry, Group, Mesh, MeshBasicMaterial, Quaternion, Vector3 } from 'three'

import { vecDistance, vecLength } from '../ephemeris/types'
import { useSelectionStore } from '../state/selectionStore'
import { useSettingsStore } from '../state/settingsStore'
import { kmToSceneUnits, toSceneRelative } from '../utils/frame'
import { frame, TRUE_RADII_KM } from './frameState'

const SUN_R = 695_700 // km, true
const Y_AXIS = new Vector3(0, 1, 0)

/**
 * Umbra/penumbra shadow cones, toggleable. Geometry is parametrized by the
 * fraction of the occulted span (Moon→Earth or Earth→Moon), so the invariant
 * that matters — whether the umbra tip reaches the target (total vs annular)
 * — is preserved in both scale modes. Cones fade in as alignment approaches
 * syzygy to avoid permanent clutter.
 */
export function ShadowCones() {
  const show = useSettingsStore((s) => s.showShadowCones)
  const root = useRef<Group>(null)

  // Refs to the three cone meshes; geometry is unit-sized, scaled per frame.
  const moonUmbra = useRef<Mesh>(null)
  const moonPenumbra = useRef<Mesh>(null)
  const earthUmbra = useRef<Mesh>(null)

  const tmp = useRef({
    dir: new Vector3(),
    pos: new Vector3(),
    q: new Quaternion(),
    a: new Vector3(),
    b: new Vector3(),
  })

  useFrame(() => {
    if (!root.current) return
    const v = tmp.current
    const { originBody } = useSelectionStore.getState()
    const origin = frame.view[originBody].pos

    const sysMoon = frame.sys.moon
    const sysEarth = frame.sys.earth

    // True geometry (km).
    const dSunMoon = vecLength(sysMoon)
    const dSunEarth = vecLength(sysEarth)
    const dEM = vecDistance(sysMoon, sysEarth)
    const moonUmbraLenKm = (dSunMoon * TRUE_RADII_KM.moon) / (SUN_R - TRUE_RADII_KM.moon)
    const earthUmbraLenKm = (dSunEarth * TRUE_RADII_KM.earth) / (SUN_R - TRUE_RADII_KM.earth)
    // Penumbra radius at the far end of the span, in units of the body radius.
    const moonPenFactor = 1 + (dEM * (SUN_R + TRUE_RADII_KM.moon)) / dSunMoon / TRUE_RADII_KM.moon

    // View-space anchors.
    toSceneRelative(frame.view.moon.pos, origin, v.a) // moon
    toSceneRelative(frame.view.earth.pos, origin, v.b) // earth
    const spanView = v.a.distanceTo(v.b)
    const moonRv = kmToSceneUnits(frame.view.moon.radiusKm)
    const earthRv = kmToSceneUnits(frame.view.earth.radiusKm)

    // Alignment fades: cones appear near syzygy only.
    toSceneRelative(frame.view.sun.pos, origin, v.pos)
    const sunToEarth = v.b.clone().sub(v.pos).normalize()
    const earthToMoon = v.a.clone().sub(v.b).normalize()

    // New-moon side (solar eclipse): moon between sun and earth.
    const moonDirFromSun = v.a.clone().sub(v.pos).normalize()
    const solarAlign = moonDirFromSun.dot(sunToEarth)
    const solarFade = smooth(0.9975, 0.99995, solarAlign)

    // Full-moon side (lunar eclipse): moon opposite the sun.
    const lunarAlign = earthToMoon.dot(sunToEarth)
    const lunarFade = smooth(0.9975, 0.99995, lunarAlign)

    // --- Moon shadow cones (point anti-sunward from the Moon) ---
    v.dir.copy(v.a).sub(v.pos).normalize() // anti-sun through the moon
    v.q.setFromUnitVectors(Y_AXIS, v.dir)

    // Umbra: tapers to zero at apexT of the moon->earth span.
    const apexT = (moonUmbraLenKm / dEM) * 1.0
    placeCone(moonUmbra.current!, v.a, v.dir, v.q, moonRv, spanView * Math.min(apexT, 1.35))
    setOpacity(moonUmbra.current!, 0.34 * solarFade)

    // Penumbra: widening frustum across the full span (the geometry's fixed
    // 2.05x flare matches the true ~2x factor; recomputed value kept for
    // reference but not applied per frame).
    void moonPenFactor
    placeCone(moonPenumbra.current!, v.a, v.dir, v.q, moonRv, spanView)
    setOpacity(moonPenumbra.current!, 0.1 * solarFade)

    // --- Earth shadow cone (lunar eclipses) ---
    v.dir.copy(v.b).sub(v.pos).normalize()
    v.q.setFromUnitVectors(Y_AXIS, v.dir)
    // True apex sits ~3.6 spans out; the geometry's fixed taper (0.65 at
    // length 1.25 spans) matches 1 - 1.25/3.6.
    void earthUmbraLenKm
    placeCone(earthUmbra.current!, v.b, v.dir, v.q, earthRv, spanView * 1.25)
    setOpacity(earthUmbra.current!, 0.3 * lunarFade)
  })

  if (!show) return null

  return (
    <group ref={root}>
      {/* Unit cones: base radius 1 at y=0, tip at y=1 (top radius per case). */}
      <mesh ref={moonUmbra} geometry={UMBRA_GEO} material={umbraMat()} renderOrder={6} />
      <mesh ref={moonPenumbra} geometry={PENUMBRA_GEO} material={penumbraMat()} renderOrder={6} />
      <mesh ref={earthUmbra} geometry={EARTH_UMBRA_GEO} material={umbraMat()} renderOrder={6} />
    </group>
  )
}

function smooth(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/** Cylinder with base at y=0, far end at y=1 (translated/rotated per frame). */
function coneGeometry(topRadius: number): CylinderGeometry {
  const g = new CylinderGeometry(topRadius, 1, 1, 48, 1, true)
  g.translate(0, 0.5, 0)
  return g
}

const UMBRA_GEO = coneGeometry(0.0001) // tapers to a point
const PENUMBRA_GEO = coneGeometry(2.05) // widens ~2x over the earth-moon span
const EARTH_UMBRA_GEO = coneGeometry(0.65) // earth umbra barely tapers by the moon

function umbraMat(): MeshBasicMaterial {
  return new MeshBasicMaterial({
    color: 0x000005,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  })
}

function penumbraMat(): MeshBasicMaterial {
  return new MeshBasicMaterial({
    color: 0x101018,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  })
}

function placeCone(
  mesh: Mesh,
  base: Vector3,
  dir: Vector3,
  q: Quaternion,
  radius: number,
  length: number,
): void {
  mesh.position.copy(base)
  mesh.quaternion.copy(q)
  mesh.scale.set(radius, length, radius)
  void dir
}

function setOpacity(mesh: Mesh, opacity: number): void {
  const m = mesh.material as MeshBasicMaterial
  m.opacity = opacity
  mesh.visible = opacity > 0.005
}
