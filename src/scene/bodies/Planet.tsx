import { useTexture } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, type ReactNode } from 'react'
import {
  Color,
  DataTexture,
  RGBAFormat,
  SRGBColorSpace,
  Vector3,
  type ShaderMaterial,
  type Texture,
} from 'three'

import { PLANET_RENDER, type TexturedPlanetId } from '../../data/planetRender'
import type { BodyId } from '../../ephemeris/types'
import { useSelectionStore } from '../../state/selectionStore'
import { kmToSceneUnits, toSceneRelative } from '../../utils/frame'
import bodyVert from '../../shaders/body.vert'
import planetFrag from '../../shaders/planet.frag'
import { BodyAnchor } from '../BodyAnchor'
import { frame, TRUE_RADII_KM } from '../frameState'
import { updateSunColor, updateSunPosition } from '../sunLight'

/** Shared 1x1 transparent texture bound to the ring-shadow sampler when unused. */
const NO_RING_TEX = new DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1, RGBAFormat)
NO_RING_TEX.needsUpdate = true

export interface RingShadowConfig {
  map: Texture
  innerKm: number
  outerKm: number
}

export interface PlanetProps {
  id: TexturedPlanetId
  /** When set, the planet receives this ring system's shadow analytically. */
  ringShadow?: RingShadowConfig
  /** Body whose disc can occlude the Sun (eclipse shadows), e.g. Earth for the Moon. */
  eclipseOccluder?: BodyId
  declutterAgainst?: BodyId
  /** Extra scene content inside the anchor (e.g. ring meshes). */
  children?: ReactNode
}

export function Planet({ id, ringShadow, eclipseOccluder, declutterAgainst, children }: PlanetProps) {
  const cfg = PLANET_RENDER[id]
  const map = useTexture(cfg.texture, (t) => {
    t.colorSpace = SRGBColorSpace
    t.anisotropy = 8
  })
  const uniforms = useMemo(
    () => ({
      uMap: { value: map },
      uSunPos: { value: new Vector3() },
      uSunColor: { value: new Color(2, 2, 2) },
      uTerminatorSoft: { value: cfg.terminatorSoft },
      uLimbDarken: { value: cfg.limbDarken },
      uRimColor: { value: new Color(...cfg.rimColor) },
      uRimStrength: { value: cfg.rimStrength },
      uAmbient: { value: 0.006 },
      uRingShadowOn: { value: ringShadow ? 1 : 0 },
      uRingMap: { value: ringShadow ? ringShadow.map : NO_RING_TEX },
      uRingCenter: { value: new Vector3() },
      uRingNormal: { value: new Vector3(0, 1, 0) },
      uRingInner: { value: 0 },
      uRingOuter: { value: 1 },
      uOccOn: { value: eclipseOccluder ? 1 : 0 },
      uOccPos: { value: new Vector3() },
      uOccRadius: { value: 1 },
      uSunRadiusW: { value: 1 },
    }),
    [map, cfg, ringShadow, eclipseOccluder],
  )

  // Per-frame updates go through the material ref: R3F clones the uniform
  // descriptors from the `uniforms` prop, so scalar writes to the memoized
  // object would never reach the GPU.
  const matRef = useRef<ShaderMaterial>(null)

  useFrame(() => {
    const u = matRef.current?.uniforms
    if (!u) return
    updateSunPosition(u.uSunPos.value as Vector3)
    updateSunColor(id, u.uSunColor.value as Color)
    if (eclipseOccluder) {
      const { originBody } = useSelectionStore.getState()
      toSceneRelative(
        frame.view[eclipseOccluder].pos,
        frame.view[originBody].pos,
        u.uOccPos.value as Vector3,
      )
      u.uOccRadius.value = kmToSceneUnits(frame.view[eclipseOccluder].radiusKm)
      u.uSunRadiusW.value = kmToSceneUnits(frame.view.sun.radiusKm)
    }
    if (ringShadow) {
      // World-space ring plane, straight from the per-frame view state.
      const { originBody } = useSelectionStore.getState()
      toSceneRelative(frame.view[id].pos, frame.view[originBody].pos, u.uRingCenter.value as Vector3)
      const pole = frame.axes[id].zAxis
      ;(u.uRingNormal.value as Vector3).set(pole.x, pole.z, -pole.y).normalize()
      // Ring radii scale with the (possibly exaggerated) view radius so the
      // ring/planet proportion is preserved in both scale modes.
      const radiusScene = kmToSceneUnits(frame.view[id].radiusKm)
      const perPlanetRadius = radiusScene / TRUE_RADII_KM[id]
      u.uRingInner.value = ringShadow.innerKm * perPlanetRadius
      u.uRingOuter.value = ringShadow.outerKm * perPlanetRadius
    }
  })

  return (
    <BodyAnchor id={id} declutterAgainst={declutterAgainst}>
      <mesh rotation-y={cfg.textureLonOffsetRad ?? 0}>
        <sphereGeometry args={[1, 64, 32]} />
        <shaderMaterial
          ref={matRef}
          vertexShader={bodyVert}
          fragmentShader={planetFrag}
          uniforms={uniforms}
        />
      </mesh>
      {children}
    </BodyAnchor>
  )
}
