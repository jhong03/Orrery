import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import {
  Color,
  DataTexture,
  RGBAFormat,
  SRGBColorSpace,
  Vector3,
  type ShaderMaterial,
} from 'three'

import { BODY_CONSTANTS } from '../../data/bodies'
import type { BodyId } from '../../ephemeris/types'
import bodyVert from '../../shaders/body.vert'
import planetFrag from '../../shaders/planet.frag'
import { BodyAnchor } from '../BodyAnchor'
import { updateSunColor, updateSunPosition } from '../sunLight'

/** 1x1 texture of the body's nominal color (no albedo maps for minors yet). */
function colorTexture(hex: string): DataTexture {
  const c = new Color(hex)
  const tex = new DataTexture(
    new Uint8Array([
      Math.round(c.r ** (1 / 2.2) * 255),
      Math.round(c.g ** (1 / 2.2) * 255),
      Math.round(c.b ** (1 / 2.2) * 255),
      255,
    ]),
    1,
    1,
    RGBAFormat,
  )
  tex.colorSpace = SRGBColorSpace
  tex.needsUpdate = true
  return tex
}

export interface MinorBodyProps {
  id: BodyId
  /** Hide the label when within px of this body (e.g. the parent planet). */
  declutterAgainst?: BodyId
  declutterPx?: number
}

/**
 * Untextured small body (planet moons, Ceres, Vesta): the generic planet
 * shader with a flat albedo, airless terminator, auto-exposure sunlight.
 */
export function MinorBody({ id, declutterAgainst, declutterPx }: MinorBodyProps) {
  const uniforms = useMemo(
    () => ({
      uMap: { value: colorTexture(BODY_CONSTANTS[id].color) },
      uSunPos: { value: new Vector3() },
      uSunColor: { value: new Color(2, 2, 2) },
      uTerminatorSoft: { value: 0.008 },
      uLimbDarken: { value: 0.1 },
      uRimColor: { value: new Color(0, 0, 0) },
      uRimStrength: { value: 0 },
      uAmbient: { value: 0.006 },
      uRingShadowOn: { value: 0 },
      uRingMap: { value: colorTexture('#000000') },
      uRingCenter: { value: new Vector3() },
      uRingNormal: { value: new Vector3(0, 1, 0) },
      uRingInner: { value: 0 },
      uRingOuter: { value: 1 },
    }),
    [id],
  )

  const matRef = useRef<ShaderMaterial>(null)

  useFrame(() => {
    const u = matRef.current?.uniforms
    if (!u) return
    updateSunPosition(u.uSunPos.value as Vector3)
    updateSunColor(id, u.uSunColor.value as Color)
  })

  return (
    <BodyAnchor id={id} declutterAgainst={declutterAgainst} declutterPx={declutterPx}>
      <mesh>
        <sphereGeometry args={[1, 32, 16]} />
        <shaderMaterial
          ref={matRef}
          vertexShader={bodyVert}
          fragmentShader={planetFrag}
          uniforms={uniforms}
        />
      </mesh>
    </BodyAnchor>
  )
}
