import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BufferAttribute,
  Color,
  Group,
  PlaneGeometry,
  ShaderMaterial,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  Vector3,
} from 'three'

import { createEnuBasis, eclToEnu, enuBasisEcl } from '../../ephemeris/topocentric'
import type { Vec3Km } from '../../ephemeris/types'
import { useSurfaceStore } from '../../state/surfaceStore'
import { frame } from '../frameState'
import { EYE_HEIGHT_KM } from './constants'
import { surfaceEvents } from './surfaceEvents'
import { loadHeightGrid, sampleHeight, TERRAIN_URL, type HeightGrid } from './terrain'
import { observerTile, tileGrid, type TileSpec } from './tiles'

// Terrain is lit by the real Sun direction so the 3D relief hill-shades:
// sunlit slopes bright, shadowed slopes dark. Ambient (sky light) keeps the
// night/shadowed side from going pure black. logdepth chunks keep depth
// consistent with the rest of the scene.
const GROUND_VERT = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_vertex>
varying vec2 vUv;
varying vec3 vN;
void main() {
  vUv = uv;
  vN = normalize(mat3(modelMatrix) * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  #include <logdepthbuf_vertex>
}
`

const GROUND_FRAG = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_fragment>
uniform sampler2D uMap;
uniform vec3 uSunDir;    // surface frame (x east, y up, -z north), unit
uniform vec3 uSunColor;  // directional sunlight (0 at night, dimmed in eclipse)
uniform vec3 uAmbient;   // sky light
varying vec2 vUv;
varying vec3 vN;
void main() {
  #include <logdepthbuf_fragment>
  vec3 albedo = texture2D(uMap, vUv).rgb;
  float ndl = max(dot(normalize(vN), uSunDir), 0.0);
  gl_FragColor = vec4(albedo * (uAmbient + uSunColor * ndl), 1.0);
}
`

/**
 * Three concentric LOD rings, finest underfoot to coarse at the horizon.
 * Each finer ring floats a couple of metres above the coarser one (`yOff`,
 * km) so it draws on top where they overlap without z-fighting. `seg` is the
 * displacement-mesh resolution per tile.
 */
// DEM (AWS Terrarium) tops out at z15, so no imagery ring goes above it.
const LAYERS = [
  { z: 15, n: 5, yOff: 0.004, seg: 36 }, // ~6 km, ~2.4 m/px — sharp foreground
  { z: 14, n: 5, yOff: 0.002, seg: 44 }, // ~12 km, ~5 m/px — near mountains
  { z: 11, n: 5, yOff: 0, seg: 32 }, // ~98 km — distant ranges + horizon
]

/** Vertical exaggeration so terrain reads as 3D from a 40 m eye height. */
const RELIEF = 1.5

/** Max anisotropy on the imagery so grazing-angle terrain stays crisp. */
const ANISOTROPY = 16

const loader = new TextureLoader()

function GroundTile({
  spec,
  yOff,
  seg,
  obsElevM,
}: {
  spec: TileSpec
  yOff: number
  seg: number
  obsElevM: number
}) {
  const [texture, setTexture] = useState<Texture | null>(null)
  const [geometry, setGeometry] = useState<PlaneGeometry | null>(null)
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: GROUND_VERT,
        fragmentShader: GROUND_FRAG,
        uniforms: {
          uMap: { value: null },
          uSunDir: { value: new Vector3(0, 1, 0) },
          uSunColor: { value: new Color(0, 0, 0) },
          uAmbient: { value: new Color(0.05, 0.05, 0.06) },
        },
      }),
    [],
  )
  useEffect(() => () => material.dispose(), [material])

  // Imagery.
  useEffect(() => {
    let cancelled = false
    let tex: Texture | undefined
    loader.load(
      spec.url,
      (t) => {
        if (cancelled) return void t.dispose()
        t.colorSpace = SRGBColorSpace
        t.anisotropy = ANISOTROPY
        tex = t
        material.uniforms.uMap.value = t
        setTexture(t)
      },
      undefined,
      () => {}, // offline: dark backdrop shows through
    )
    return () => {
      cancelled = true
      tex?.dispose()
      setTexture(null)
    }
  }, [spec.url, material])

  // Elevation -> displaced plane (flat fallback if the DEM tile is missing).
  useEffect(() => {
    let cancelled = false
    const geo = new PlaneGeometry(spec.wKm, spec.hKm, seg, seg)
    loadHeightGrid(TERRAIN_URL(spec.z, spec.ty, spec.tx), seg + 1).then(
      (grid: HeightGrid | null) => {
        if (cancelled) return
        if (grid) {
          const pos = geo.getAttribute('position') as BufferAttribute
          for (let i = 0; i < pos.count; i++) {
            const u = pos.getX(i) / spec.wKm + 0.5
            const v = pos.getY(i) / spec.hKm + 0.5
            const h = sampleHeight(grid, u, v)
            pos.setZ(i, ((h - obsElevM) / 1000) * RELIEF) // metres -> km, exaggerated
          }
          pos.needsUpdate = true
          geo.computeVertexNormals()
        }
        setGeometry(geo)
      },
    )
    return () => {
      cancelled = true
      geo.dispose()
      setGeometry(null)
    }
  }, [spec.z, spec.tx, spec.ty, spec.wKm, spec.hKm, seg, obsElevM])

  if (!texture || !geometry) return null
  return (
    <mesh
      geometry={geometry}
      material={material}
      position={[spec.eKm, -EYE_HEIGHT_KM + yOff, -spec.nKm]}
      rotation-x={-Math.PI / 2}
      renderOrder={-39}
    />
  )
}

/**
 * 3D ground under the observer: Esri World Imagery draped over real elevation
 * (AWS Terrarium DEM), so mountains, coasts and canyons rise in relief.
 * Brightness follows the Sun's altitude (dark at night) and dims in totality.
 */
export function GroundTiles() {
  const latDeg = useSurfaceStore((s) => s.latDeg)
  const lonDeg = useSurfaceStore((s) => s.lonDeg)
  const groupRef = useRef<Group>(null)
  const tmp = useRef({
    basis: createEnuBasis(),
    enu: { x: 0, y: 0, z: 0 } as Vec3Km,
    sunDir: new Vector3(0, 1, 0),
    sunColor: new Color(),
    ambient: new Color(),
  })

  // Observer's ground elevation: the reference that sits at the eye's foot.
  // (Keeps its previous value across a location change until the new tile
  // resolves — the cancelled guard discards stale fetches.)
  const [obsElevM, setObsElevM] = useState<number | null>(null)
  useEffect(() => {
    let cancelled = false
    const ot = observerTile(latDeg, lonDeg, 14)
    loadHeightGrid(TERRAIN_URL(ot.z, ot.ty, ot.tx), 129).then((grid) => {
      if (cancelled) return
      setObsElevM(grid ? sampleHeight(grid, ot.fx, 1 - ot.fy) : 0)
    })
    return () => {
      cancelled = true
    }
  }, [latDeg, lonDeg])

  const layers = useMemo(
    () => LAYERS.map((l) => ({ ...l, tiles: tileGrid(latDeg, lonDeg, l.z, l.n) })),
    [latDeg, lonDeg],
  )

  useFrame(() => {
    const group = groupRef.current
    if (!group) return
    const t = tmp.current
    const b = t.basis
    enuBasisEcl(latDeg, lonDeg, frame.axes.earth, b)

    // Sun direction in the surface frame (x east, y up, -z north).
    const d = frame.sys.sun
    const e = frame.sys.earth
    t.enu.x = d.x - e.x
    t.enu.y = d.y - e.y
    t.enu.z = d.z - e.z
    eclToEnu(t.enu, b, t.enu)
    const len = Math.hypot(t.enu.x, t.enu.y, t.enu.z)
    t.sunDir.set(t.enu.x / len, t.enu.z / len, -t.enu.y / len)
    const sinAlt = t.sunDir.y

    // Sunlight: present only above the horizon, reddened near it, killed in
    // totality. Sky ambient fills shadows and the night side (never black).
    const eclipse = 1 - surfaceEvents.solarOcclusion * 0.97
    const sun = Math.min(1, Math.max(0, (sinAlt + 0.03) / 0.12)) * eclipse
    const warm = Math.min(1, Math.max(0, sinAlt * 5)) // 0 at horizon -> 1 high up
    t.sunColor.setRGB(1.25 * sun, (0.78 + 0.42 * warm) * sun, (0.55 + 0.5 * warm) * sun)
    const day = Math.min(1, Math.max(0, (sinAlt + 0.1) / 0.25))
    const amb = (0.05 + 0.4 * day) * (1 - surfaceEvents.solarOcclusion * 0.85)
    t.ambient.setRGB(amb * 0.9, amb * 0.95, amb * 1.1) // faintly sky-blue

    group.traverse((o) => {
      const mat = (o as { material?: ShaderMaterial }).material
      if (mat instanceof ShaderMaterial && mat.uniforms.uSunDir) {
        ;(mat.uniforms.uSunDir.value as Vector3).copy(t.sunDir)
        ;(mat.uniforms.uSunColor.value as Color).copy(t.sunColor)
        ;(mat.uniforms.uAmbient.value as Color).copy(t.ambient)
      }
    })
  })

  // Wait for the reference elevation so tiles displace against the right datum.
  if (obsElevM === null) return null

  return (
    <group ref={groupRef}>
      {layers.map((layer) =>
        layer.tiles.map((spec) => (
          <GroundTile
            key={spec.key}
            spec={spec}
            yOff={layer.yOff}
            seg={layer.seg}
            obsElevM={obsElevM}
          />
        )),
      )}
    </group>
  )
}
