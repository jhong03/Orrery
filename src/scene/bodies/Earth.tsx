import { useTexture } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  BackSide,
  Color,
  MathUtils,
  RepeatWrapping,
  SRGBColorSpace,
  Vector3,
  type ShaderMaterial,
  type Texture,
} from 'three'

import { useSelectionStore } from '../../state/selectionStore'
import { useSettingsStore } from '../../state/settingsStore'
import { useSurfaceStore } from '../../state/surfaceStore'
import { asset } from '../../utils/asset'
import { kmToSceneUnits, toSceneRelative } from '../../utils/frame'
import atmosphereFrag from '../../shaders/atmosphere.frag'
import bodyVert from '../../shaders/body.vert'
import cloudsFrag from '../../shaders/clouds.frag'
import earthFrag from '../../shaders/earth.frag'
import { BodyAnchor } from '../BodyAnchor'
import { frame } from '../frameState'
import { updateSunColor, updateSunPosition } from '../sunLight'
import { useProgressiveTexture } from '../useProgressiveTexture'

/** Clouds drift one full revolution relative to the surface every ~24 days. */
const CLOUD_DRIFT_PER_DAY = 1 / 24

/** Stable map configurer (module scope — see useProgressiveTexture). */
function configureEarthMap(t: Texture) {
  t.colorSpace = SRGBColorSpace
  t.anisotropy = 16
  // Equirectangular maps wrap in longitude. The cloud layer samples at
  // vUv.x + uCloudShift (up to ~1.7), so without RepeatWrapping the shift past
  // u=1 clamps to the edge column and smears it into bands across the globe.
  t.wrapS = RepeatWrapping
}

/**
 * Earth's full shader stack: day/night surface with ocean glint and projected
 * cloud shadows, an independent cloud sphere, and a Fresnel atmosphere shell
 * with a sunset-orange terminator ring.
 */
export function Earth() {
  const quality = useSettingsStore((s) => s.quality)
  // Day/night show at the working tier immediately and upgrade to 8K in the
  // background on Ultra; clouds have no hi-res variant.
  const dayMap = useProgressiveTexture('/textures/earth_day.jpg', quality, configureEarthMap)
  const nightMap = useProgressiveTexture('/textures/earth_night.jpg', quality, configureEarthMap)
  const cloudMap = useTexture(asset('/textures/earth_clouds.jpg'), configureEarthMap)

  const surfaceUniforms = useMemo(
    () => ({
      uDayMap: { value: dayMap },
      uNightMap: { value: nightMap },
      uCloudMap: { value: cloudMap },
      uSunPos: { value: new Vector3() },
      uSunColor: { value: new Color(2, 2, 2) },
      uCloudShift: { value: 0 },
      uPoleW: { value: new Vector3(0, 1, 0) },
      uAmbient: { value: 0.006 },
      // The Moon's eclipse shadow (umbra spot + penumbra).
      uOccOn: { value: 1 },
      uOccPos: { value: new Vector3() },
      uOccRadius: { value: 1 },
      uSunRadiusW: { value: 1 },
    }),
    [dayMap, nightMap, cloudMap],
  )

  const cloudUniforms = useMemo(
    () => ({
      uCloudMap: { value: cloudMap },
      uSunPos: { value: new Vector3() },
      uSunColor: { value: new Color(2, 2, 2) },
      uCloudShift: { value: 0 },
    }),
    [cloudMap],
  )

  const atmoUniforms = useMemo(
    () => ({
      uSunPos: { value: new Vector3() },
      uDayColor: { value: new Color(0.23, 0.5, 1.0) },
      uSunsetColor: { value: new Color(1.0, 0.42, 0.15) },
      uIntensity: { value: 1.25 },
    }),
    [],
  )

  const surfaceMat = useRef<ShaderMaterial>(null)
  const cloudMat = useRef<ShaderMaterial>(null)
  const atmoMat = useRef<ShaderMaterial>(null)

  // Quality switches swap the day/night maps; write through the material
  // ref (R3F clones the `uniforms` prop descriptors).
  useEffect(() => {
    const u = surfaceMat.current?.uniforms
    if (!u) return
    u.uDayMap.value = dayMap
    u.uNightMap.value = nightMap
  }, [dayMap, nightMap])

  useFrame(() => {
    // Write through material refs (R3F clones uniform descriptors, so
    // scalar writes to the memoized objects would not reach the GPU).
    const su = surfaceMat.current?.uniforms
    const cu = cloudMat.current?.uniforms
    const au = atmoMat.current?.uniforms
    if (!su || !cu || !au) return
    updateSunPosition(su.uSunPos.value as Vector3)
    ;(cu.uSunPos.value as Vector3).copy(su.uSunPos.value as Vector3)
    ;(au.uSunPos.value as Vector3).copy(su.uSunPos.value as Vector3)
    updateSunColor('earth', su.uSunColor.value as Color)
    ;(cu.uSunColor.value as Color).copy(su.uSunColor.value as Color)

    const shift = (frame.jd * CLOUD_DRIFT_PER_DAY) % 1
    su.uCloudShift.value = shift
    cu.uCloudShift.value = shift

    const pole = frame.axes.earth.zAxis
    ;(su.uPoleW.value as Vector3).set(pole.x, pole.z, -pole.y).normalize()

    // Moon occluder for the solar-eclipse umbra spot.
    const { originBody } = useSelectionStore.getState()
    toSceneRelative(frame.view.moon.pos, frame.view[originBody].pos, su.uOccPos.value as Vector3)
    su.uOccRadius.value = kmToSceneUnits(frame.view.moon.radiusKm)
    su.uSunRadiusW.value = kmToSceneUnits(frame.view.sun.radiusKm)
  })

  return (
    <BodyAnchor id="earth">
      <mesh
        onDoubleClick={(e) => {
          e.stopPropagation()
          // Hit point -> mesh-local unit vector -> geographic lat/lon.
          // Local texture convention: +X = lon 0, +Y = north, -Z = 90 E.
          const p = e.object.worldToLocal(e.point.clone()).normalize()
          const latDeg = (Math.asin(MathUtils.clamp(p.y, -1, 1)) * 180) / Math.PI
          const lonDeg = (Math.atan2(-p.z, p.x) * 180) / Math.PI
          useSurfaceStore.getState().enter(latDeg, lonDeg)
        }}
      >
        <sphereGeometry args={[1, 96, 48]} />
        <shaderMaterial
          ref={surfaceMat}
          vertexShader={bodyVert}
          fragmentShader={earthFrag}
          uniforms={surfaceUniforms}
        />
      </mesh>
      <mesh scale={1.012} renderOrder={2}>
        <sphereGeometry args={[1, 64, 32]} />
        <shaderMaterial
          ref={cloudMat}
          vertexShader={bodyVert}
          fragmentShader={cloudsFrag}
          uniforms={cloudUniforms}
          transparent
          depthWrite={false}
        />
      </mesh>
      <mesh scale={1.035} renderOrder={3}>
        <sphereGeometry args={[1, 64, 32]} />
        <shaderMaterial
          ref={atmoMat}
          vertexShader={bodyVert}
          fragmentShader={atmosphereFrag}
          uniforms={atmoUniforms}
          side={BackSide}
          transparent
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </BodyAnchor>
  )
}
