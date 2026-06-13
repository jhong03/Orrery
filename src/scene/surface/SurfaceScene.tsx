import { Html } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  Matrix4,
  Mesh,
  Points,
  Quaternion,
  Vector3,
  type DirectionalLight,
  type MeshBasicMaterial,
  type PerspectiveCamera,
  type PointsMaterial,
} from 'three'

import { BODY_CONSTANTS } from '../../data/bodies'
import {
  angularRadius,
  createEnuBasis,
  enuBasisEcl,
  observerHelioKm,
  type EnuBasis,
} from '../../ephemeris/topocentric'
import { PLANET_IDS, type Vec3Km } from '../../ephemeris/types'
import { useSurfaceStore } from '../../state/surfaceStore'
import { axesToQuaternion } from '../../utils/frame'
import { frame } from '../frameState'
import { Starfield } from '../Starfield'
import {
  BACKDROP_DEPTH_KM,
  GROUND_RADIUS_KM,
  PLANET_POINT_DIST_KM,
  SUN_DISC_DIST_KM,
} from './constants'
import { Aurora } from './Aurora'
import { Corona } from './Corona'
import { GroundTiles } from './GroundTiles'
import { Meteors } from './Meteors'
import { Moon } from './Moon'
import { SkyDome } from './SkyDome'
import { SurfaceControls } from './SurfaceControls'
import { updateSurfaceEvents } from './surfaceEvents'

/** Sky-facing planets (Earth excluded — we are standing on it). */
const SKY_PLANETS = PLANET_IDS.filter((id) => id !== 'earth')

/** Ecliptic km vector -> three scene axes (x, z, -y), still in km. */
function setEclThree(v: Vec3Km, out: Vector3): Vector3 {
  return out.set(v.x, v.z, -v.y)
}

/**
 * Quaternion mapping ecliptic-three content into the observer's frame
 * (+X east, +Y zenith, -Z north). Lets the orbit scene's conventions —
 * the Starfield, IAU body quaternions, (x, z, -y) positions — be reused
 * unchanged inside one reoriented group.
 */
function eclThreeToSurface(b: EnuBasis, m: Matrix4, out: Quaternion): Quaternion {
  m.set(
    b.east.x,
    b.east.z,
    -b.east.y,
    0,
    b.up.x,
    b.up.z,
    -b.up.y,
    0,
    -b.north.x,
    -b.north.z,
    b.north.y,
    0,
    0,
    0,
    0,
    1,
  )
  return out.setFromRotationMatrix(m)
}

const COMPASS = [
  { label: 'N', az: 0 },
  { label: 'E', az: 90 },
  { label: 'S', az: 180 },
  { label: 'W', az: 270 },
]

export function SurfaceScene() {
  const active = useSurfaceStore((s) => s.active)
  if (!active) return null
  return <SurfaceSceneInner />
}

function SurfaceSceneInner() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera

  const celestialRef = useRef<Group>(null)
  const sunRef = useRef<Mesh>(null)
  const lightRef = useRef<DirectionalLight>(null)
  const moonGroupRef = useRef<Group>(null)
  const planetsRef = useRef<Points>(null)

  const tmp = useRef({
    basis: createEnuBasis(),
    obs: { x: 0, y: 0, z: 0 } as Vec3Km,
    d: { x: 0, y: 0, z: 0 } as Vec3Km,
    v: new Vector3(),
    m4: new Matrix4(),
    q: new Quaternion(),
    moonQ: new Quaternion(),
  })

  // Ground-level frustum while standing: 0.5 m near plane, sky-sphere far.
  useEffect(() => {
    const prev = {
      near: camera.near,
      far: camera.far,
      fov: camera.fov,
      pos: camera.position.clone(),
      quat: camera.quaternion.clone(),
    }
    camera.near = 0.0005
    camera.far = 1e8
    camera.position.set(0, 0, 0)
    camera.updateProjectionMatrix()
    return () => {
      camera.near = prev.near
      camera.far = prev.far
      camera.fov = prev.fov
      camera.position.copy(prev.pos)
      camera.quaternion.copy(prev.quat)
      camera.updateProjectionMatrix()
    }
  }, [camera])

  // Planet points: 7 planets, positions rewritten per frame.
  const planetGeo = useMemo(() => {
    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(new Float32Array(SKY_PLANETS.length * 3), 3))
    const colors = new Float32Array(SKY_PLANETS.length * 3)
    SKY_PLANETS.forEach((id, i) => {
      const c = new Color(BODY_CONSTANTS[id].color)
      colors[i * 3] = c.r * 2.2
      colors[i * 3 + 1] = c.g * 2.2
      colors[i * 3 + 2] = c.b * 2.2
    })
    geo.setAttribute('color', new BufferAttribute(colors, 3))
    geo.boundingSphere = null
    return geo
  }, [])
  useEffect(() => () => planetGeo.dispose(), [planetGeo])

  useFrame(() => {
    const t = tmp.current
    const { latDeg, lonDeg } = useSurfaceStore.getState()

    enuBasisEcl(latDeg, lonDeg, frame.axes.earth, t.basis)
    observerHelioKm(frame.sys.earth, t.basis, t.obs)
    updateSurfaceEvents(t.obs)

    // One group reorients all ecliptic-three content into the horizon frame.
    if (celestialRef.current) {
      celestialRef.current.quaternion.copy(eclThreeToSurface(t.basis, t.m4, t.q))
    }

    // Sun disc along its true topocentric direction, true angular size.
    t.d.x = frame.sys.sun.x - t.obs.x
    t.d.y = frame.sys.sun.y - t.obs.y
    t.d.z = frame.sys.sun.z - t.obs.z
    const sunDist = Math.hypot(t.d.x, t.d.y, t.d.z)
    const sunDiscRadius = SUN_DISC_DIST_KM * Math.tan(angularRadius(695_700, sunDist))
    // Sun altitude (sine) for disc reddening and the directional light.
    const sunSinAlt = (t.d.x * t.basis.up.x + t.d.y * t.basis.up.y + t.d.z * t.basis.up.z) / sunDist
    if (sunRef.current) {
      setEclThree(t.d, t.v).normalize()
      sunRef.current.position.copy(t.v).multiplyScalar(SUN_DISC_DIST_KM)
      sunRef.current.scale.setScalar(sunDiscRadius)
      // Redden and dim the disc as it nears the horizon (atmospheric extinction).
      const low = 1 - Math.min(1, Math.max(0, (sunSinAlt + 0.02) / 0.18))
      const mat = sunRef.current.material as MeshBasicMaterial
      mat.color.setRGB(26, 26 - 12 * low, 26 - 21 * low).multiplyScalar(1 - 0.55 * low)
      lightRef.current?.position.copy(t.v).multiplyScalar(1e6)
    }

    // Moon at its TRUE topocentric position (km) — parallax included, so
    // solar eclipses literally happen on screen.
    if (moonGroupRef.current) {
      t.d.x = frame.sys.moon.x - t.obs.x
      t.d.y = frame.sys.moon.y - t.obs.y
      t.d.z = frame.sys.moon.z - t.obs.z
      moonGroupRef.current.position.copy(setEclThree(t.d, t.v))
      moonGroupRef.current.quaternion.copy(axesToQuaternion(frame.axes.moon, t.moonQ))
    }

    // Planet points pinned at a fixed sky distance along true directions.
    const pos = planetGeo.getAttribute('position') as BufferAttribute
    SKY_PLANETS.forEach((id, i) => {
      t.d.x = frame.sys[id].x - t.obs.x
      t.d.y = frame.sys[id].y - t.obs.y
      t.d.z = frame.sys[id].z - t.obs.z
      setEclThree(t.d, t.v).normalize().multiplyScalar(PLANET_POINT_DIST_KM)
      pos.setXYZ(i, t.v.x, t.v.y, t.v.z)
    })
    pos.needsUpdate = true

    // Planets and stars wash out in daylight: fade points with Sun altitude.
    t.d.x = frame.sys.sun.x - frame.sys.earth.x
    t.d.y = frame.sys.sun.y - frame.sys.earth.y
    t.d.z = frame.sys.sun.z - frame.sys.earth.z
    const sunUp =
      (t.d.x * t.basis.up.x + t.d.y * t.basis.up.y + t.d.z * t.basis.up.z) /
      Math.hypot(t.d.x, t.d.y, t.d.z)
    const night = 1 - Math.min(1, Math.max(0, (sunUp + 0.05) / 0.12))
    const mat = planetsRef.current?.material as PointsMaterial | undefined
    if (mat) {
      mat.opacity = night
      mat.transparent = true
    }
  })

  return (
    <>
      <SurfaceControls />

      <SkyDome />

      <group ref={celestialRef}>
        <Starfield />
        <Corona />
        <mesh ref={sunRef} name="surface-sun" renderOrder={-50}>
          <sphereGeometry args={[1, 48, 24]} />
          {/* HDR white-gold: the bloom pass turns it into glare. */}
          <meshBasicMaterial color={[26, 24, 20]} toneMapped={false} />
        </mesh>
        <group name="surface-moon">
          <Moon ref={moonGroupRef} />
        </group>
        <points ref={planetsRef} geometry={planetGeo} renderOrder={-49}>
          <pointsMaterial size={4.5} sizeAttenuation={false} vertexColors />
        </points>
        <directionalLight ref={lightRef} intensity={2.6} />
        <ambientLight intensity={0.06} />
      </group>

      {/* Backdrop well below any terrain relief: catches cracks between tiles
          and the view beyond the tile grid, without occluding canyon floors
          that dip below the eye. The 3D ground draws on top of it. */}
      <mesh position={[0, -BACKDROP_DEPTH_KM, 0]} rotation-x={-Math.PI / 2} renderOrder={-40}>
        <circleGeometry args={[GROUND_RADIUS_KM, 64]} />
        <meshBasicMaterial color="#0a0d09" />
      </mesh>
      <GroundTiles />
      <Meteors />
      <Aurora />

      {/* Compass markers pinned just above the horizon, 1 km out. */}
      {COMPASS.map(({ label, az }) => {
        const a = (az * Math.PI) / 180
        return (
          <Html key={label} position={[Math.sin(a), 0, -Math.cos(a)]} center zIndexRange={[10, 0]}>
            <span className="compass-label">{label}</span>
          </Html>
        )
      })}
    </>
  )
}
