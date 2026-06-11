import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Vector3,
  type ShaderMaterial,
  type Texture,
} from 'three'

import type { BodyId } from '../../ephemeris/types'
import { useSelectionStore } from '../../state/selectionStore'
import { kmToSceneUnits, toSceneRelative } from '../../utils/frame'
import bodyVert from '../../shaders/body.vert'
import ringsFrag from '../../shaders/rings.frag'
import { frame, TRUE_RADII_KM } from '../frameState'
import { updateSunColor, updateSunPosition } from '../sunLight'

export interface RingsProps {
  /** Planet whose anchor this ring sits inside. */
  planet: BodyId
  map: Texture
  innerKm: number
  outerKm: number
}

/**
 * A planetary ring system. Lives inside the planet's BodyAnchor, in the local
 * XZ plane (the anchor quaternion maps +Y to the IAU pole). UV.x runs
 * radially from the inner (0) to the outer (1) edge to sample the strip
 * texture; the planet's shadow is computed analytically in the fragment.
 */
export function Rings({ planet, map, innerKm, outerKm }: RingsProps) {
  const geometry = useMemo(() => {
    const inner = innerKm / TRUE_RADII_KM[planet]
    const outer = outerKm / TRUE_RADII_KM[planet]
    const SEG = 256
    const positions = new Float32Array((SEG + 1) * 2 * 3)
    const uvs = new Float32Array((SEG + 1) * 2 * 2)
    const normals = new Float32Array((SEG + 1) * 2 * 3)
    const index: number[] = []
    for (let i = 0; i <= SEG; i++) {
      const a = (i / SEG) * Math.PI * 2
      const cos = Math.cos(a)
      const sin = Math.sin(a)
      for (let j = 0; j < 2; j++) {
        const r = j === 0 ? inner : outer
        const v = (i * 2 + j) * 3
        positions[v] = cos * r
        positions[v + 1] = 0
        positions[v + 2] = sin * r
        normals[v] = 0
        normals[v + 1] = 1
        normals[v + 2] = 0
        const t = (i * 2 + j) * 2
        uvs[t] = j // radial coordinate
        uvs[t + 1] = 0.5
      }
      if (i < SEG) {
        const k = i * 2
        index.push(k, k + 1, k + 2, k + 1, k + 3, k + 2)
      }
    }
    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(positions, 3))
    geo.setAttribute('normal', new BufferAttribute(normals, 3))
    geo.setAttribute('uv', new BufferAttribute(uvs, 2))
    geo.setIndex(index)
    return geo
  }, [planet, innerKm, outerKm])

  const uniforms = useMemo(
    () => ({
      uRingMap: { value: map },
      uSunPos: { value: new Vector3() },
      uSunColor: { value: new Color(2, 2, 2) },
      uPlanetCenter: { value: new Vector3() },
      uPlanetRadius: { value: 1 },
    }),
    [map],
  )

  // Per-frame writes go through the material ref (R3F clones the uniform
  // descriptors, so scalar writes to the memoized objects are lost).
  const matRef = useRef<ShaderMaterial>(null)

  useFrame(() => {
    const u = matRef.current?.uniforms
    if (!u) return
    updateSunPosition(u.uSunPos.value as Vector3)
    updateSunColor(planet, u.uSunColor.value as Color)
    const { originBody } = useSelectionStore.getState()
    toSceneRelative(
      frame.view[planet].pos,
      frame.view[originBody].pos,
      u.uPlanetCenter.value as Vector3,
    )
    u.uPlanetRadius.value = kmToSceneUnits(frame.view[planet].radiusKm)
  })

  return (
    <mesh geometry={geometry} renderOrder={1}>
      <shaderMaterial
        ref={matRef}
        vertexShader={bodyVert}
        fragmentShader={ringsFrag}
        uniforms={uniforms}
        transparent
        side={DoubleSide}
        depthWrite={false}
      />
    </mesh>
  )
}
