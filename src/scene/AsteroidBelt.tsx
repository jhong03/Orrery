import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  Group,
  IcosahedronGeometry,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Vector3,
  type ShaderMaterial,
} from 'three'

import { BELT_MAX_COUNT, QUALITY } from '../data/quality'
import { J2000_JD } from '../ephemeris/time'
import { KM_PER_AU, type Vec3Km } from '../ephemeris/types'
import { useSelectionStore } from '../state/selectionStore'
import { useSettingsStore } from '../state/settingsStore'
import { KM_PER_SCENE_UNIT, toSceneRelative } from '../utils/frame'
import { compressDistanceKm } from '../utils/scale'
import beltFrag from '../shaders/belt.frag'
import beltVert from '../shaders/belt.vert'
import { frame } from './frameState'

// Buffers are sized for the Ultra preset; lower presets just draw a prefix
// of the instances via `instanceCount`.
const COUNT = BELT_MAX_COUNT
const ZERO: Vec3Km = { x: 0, y: 0, z: 0 }

/** Mulberry32: deterministic, so the belt is identical every load. */
function rng(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Kirkwood gaps (au) — rocks are not placed near these resonances. */
const GAPS = [2.502, 2.825, 2.958]

function buildGeometry(): InstancedBufferGeometry {
  const rand = rng(20260611)

  // Base rock: a displaced icosahedron; per-instance rotation/size/tint
  // disguise the shared shape.
  const base = new IcosahedronGeometry(1, 1)
  const pos = base.getAttribute('position')
  for (let i = 0; i < pos.count; i++) {
    const d = 0.72 + rand() * 0.55
    pos.setXYZ(i, pos.getX(i) * d, pos.getY(i) * d, pos.getZ(i) * d)
  }
  base.computeVertexNormals()

  const geo = new InstancedBufferGeometry()
  geo.index = base.index
  geo.setAttribute('position', base.getAttribute('position'))
  geo.setAttribute('normal', base.getAttribute('normal'))
  geo.instanceCount = COUNT

  const e1 = new Float32Array(COUNT * 3)
  const e2 = new Float32Array(COUNT * 3)
  const radReal = new Float32Array(COUNT)
  const radVis = new Float32Array(COUNT)
  const meanMotion = new Float32Array(COUNT)
  const phase = new Float32Array(COUNT)
  const size = new Float32Array(COUNT)
  const tint = new Float32Array(COUNT)
  const spinAxis = new Float32Array(COUNT * 3)
  const spinRate = new Float32Array(COUNT)

  for (let i = 0; i < COUNT; i++) {
    // Semi-major axis 2.1-3.3 au, avoiding the Kirkwood gaps.
    let a = 0
    for (;;) {
      a = 2.1 + rand() * 1.2
      if (GAPS.every((g) => Math.abs(a - g) > 0.024)) break
    }

    // Orbit plane: node uniform, inclination Rayleigh-ish (sigma ~ 6 deg).
    const om = rand() * Math.PI * 2
    const inc = Math.sqrt(-2 * Math.log(1 - rand() * 0.985)) * 6 * (Math.PI / 180)
    const co = Math.cos(om)
    const so = Math.sin(om)
    const ci = Math.cos(inc)
    const si = Math.sin(inc)
    // Ecliptic basis (Rz(om) * Rx(inc) applied to x/y), then scene axis swap
    // (x, y, z)ecl -> (x, z, -y)three.
    const ex = co
    const ey = so
    const ez = 0
    const fx = -so * ci
    const fy = co * ci
    const fz = si
    e1[i * 3] = ex
    e1[i * 3 + 1] = ez
    e1[i * 3 + 2] = -ey
    e2[i * 3] = fx
    e2[i * 3 + 1] = fz
    e2[i * 3 + 2] = -fy

    const aKm = a * KM_PER_AU
    radReal[i] = aKm / KM_PER_SCENE_UNIT
    radVis[i] = compressDistanceKm(aKm) / KM_PER_SCENE_UNIT
    // Correct Keplerian angular speed from the TRUE semi-major axis.
    const periodDays = 365.25 * Math.pow(a, 1.5)
    meanMotion[i] = (2 * Math.PI) / periodDays
    phase[i] = rand() * Math.PI * 2

    // Decorative sizes (real rocks would be sub-pixel): 30-260 scene units.
    size[i] = 30 + Math.pow(rand(), 2.2) * 230
    tint[i] = rand()

    const ax = rand() * 2 - 1
    const ay = rand() * 2 - 1
    const az = rand() * 2 - 1
    const al = Math.hypot(ax, ay, az) || 1
    spinAxis[i * 3] = ax / al
    spinAxis[i * 3 + 1] = ay / al
    spinAxis[i * 3 + 2] = az / al
    spinRate[i] = (rand() - 0.5) * 0.4
  }

  geo.setAttribute('aE1', new InstancedBufferAttribute(e1, 3))
  geo.setAttribute('aE2', new InstancedBufferAttribute(e2, 3))
  geo.setAttribute('aRadReal', new InstancedBufferAttribute(radReal, 1))
  geo.setAttribute('aRadVis', new InstancedBufferAttribute(radVis, 1))
  geo.setAttribute('aN', new InstancedBufferAttribute(meanMotion, 1))
  geo.setAttribute('aPhase', new InstancedBufferAttribute(phase, 1))
  geo.setAttribute('aSize', new InstancedBufferAttribute(size, 1))
  geo.setAttribute('aTint', new InstancedBufferAttribute(tint, 1))
  geo.setAttribute('aSpinAxis', new InstancedBufferAttribute(spinAxis, 3))
  geo.setAttribute('aSpinRate', new InstancedBufferAttribute(spinRate, 1))
  return geo
}

/**
 * Instanced rocks between 2.1 and 3.3 au (count set by the quality preset),
 * each on its own correctly paced Keplerian circle, evaluated per-vertex on
 * the GPU. One draw call.
 */
export function AsteroidBelt() {
  const geometry = useMemo(() => buildGeometry(), [])
  const groupRef = useRef<Group>(null)
  const offset = useRef(new Vector3())

  const quality = useSettingsStore((s) => s.quality)
  useEffect(() => {
    geometry.instanceCount = QUALITY[quality].beltCount
  }, [geometry, quality])

  const uniforms = useMemo(
    () => ({
      uDays: { value: 0 },
      uMode: { value: 1 },
    }),
    [],
  )

  // Scalar uniforms must be written through the material ref (R3F clones
  // the uniform descriptors from the prop).
  const matRef = useRef<ShaderMaterial>(null)

  useFrame(() => {
    const u = matRef.current?.uniforms
    if (u) {
      u.uDays.value = frame.jd - J2000_JD
      u.uMode.value = useSettingsStore.getState().scaleMode === 'visible' ? 1 : 0
    }
    const { originBody } = useSelectionStore.getState()
    if (groupRef.current) {
      groupRef.current.position.copy(
        toSceneRelative(ZERO, frame.view[originBody].pos, offset.current),
      )
    }
  })

  return (
    <group ref={groupRef}>
      <mesh geometry={geometry} frustumCulled={false}>
        <shaderMaterial
          ref={matRef}
          vertexShader={beltVert}
          fragmentShader={beltFrag}
          uniforms={uniforms}
        />
      </mesh>
    </group>
  )
}
