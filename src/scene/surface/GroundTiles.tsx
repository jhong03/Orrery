import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BufferAttribute,
  Color,
  Group,
  LinearMipmapLinearFilter,
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
  vec3 n = normalize(vN);
  // Wrap the diffuse term slightly so shadowed slopes keep a little shape
  // instead of crushing to flat ambient — softer, more natural relief.
  float ndl = clamp((dot(n, uSunDir) + 0.15) / 1.15, 0.0, 1.0);
  gl_FragColor = vec4(albedo * (uAmbient + uSunColor * ndl), 1.0);
}
`

/**
 * Concentric LOD rings, sharp underfoot to coarse at the horizon. Imagery
 * zoom (`imgZ`) is decoupled from elevation zoom (`demZ`): the foreground gets
 * very crisp Esri imagery (z17, ~1 m/px) over the finest DEM the provider
 * serves (z15), while distant rings drop both. Each finer ring floats a couple
 * of metres above the coarser one (`yOff`, km) so it wins where they overlap.
 * `seg` is the displacement-mesh resolution per tile.
 */
const LAYERS = [
  { imgZ: 17, demZ: 15, n: 5, seg: 48, yOff: 0.004 }, // ~1.5 km, ~1 m/px — crisp foreground
  { imgZ: 14, demZ: 14, n: 5, seg: 44, yOff: 0.002 }, // ~12 km — near/mid mountains
  { imgZ: 11, demZ: 11, n: 5, seg: 56, yOff: 0 }, // ~98 km — distant ranges + horizon
]

/** Vertical exaggeration so terrain reads as 3D from a 40 m eye height. */
const RELIEF = 1.5

/** Grow each tile mesh past its bounds so neighbours overlap rather than leave
 *  a hairline gap (which shows the dark backdrop through as a crack). */
const OVERSCAN = 1.03

/** Max anisotropy on the imagery so grazing-angle terrain stays crisp. */
const ANISOTROPY = 16

const loader = new TextureLoader()

/** One preloaded ground tile: imagery texture + (optional) elevation grid. */
interface ReadyTile {
  spec: TileSpec
  seg: number
  yOff: number
  texture: Texture
  grid: HeightGrid | null
}

function loadTexture(url: string): Promise<Texture | null> {
  return new Promise((resolve) => {
    loader.load(
      url,
      (t) => {
        t.colorSpace = SRGBColorSpace
        t.anisotropy = ANISOTROPY
        t.minFilter = LinearMipmapLinearFilter
        t.generateMipmaps = true
        resolve(t)
      },
      undefined,
      () => resolve(null),
    )
  })
}

function GroundTile({ spec, seg, yOff, texture, grid, obsElevM }: ReadyTile & { obsElevM: number }) {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: GROUND_VERT,
        fragmentShader: GROUND_FRAG,
        uniforms: {
          uMap: { value: texture },
          uSunDir: { value: new Vector3(0, 1, 0) },
          uSunColor: { value: new Color(0, 0, 0) },
          uAmbient: { value: new Color(0.05, 0.05, 0.06) },
        },
      }),
    [texture],
  )

  // Displaced plane, built once from the preloaded DEM. Overscanned so tiles
  // overlap; heights sampled bilinearly through the imagery tile's sub-rect of
  // its (possibly coarser) elevation tile.
  const geometry = useMemo(() => {
    const wKm = spec.wKm * OVERSCAN
    const hKm = spec.hKm * OVERSCAN
    const geo = new PlaneGeometry(wKm, hKm, seg, seg)
    if (grid) {
      const pos = geo.getAttribute('position') as BufferAttribute
      for (let i = 0; i < pos.count; i++) {
        const u = pos.getX(i) / wKm + 0.5 // 0..1 across the (overscanned) tile
        const v = pos.getY(i) / hKm + 0.5
        // Map into the DEM tile's sub-rect (v=0 bottom). demScale === 1 and
        // demSx/demSy === 0 collapse this to the identity for matched zoom.
        const du = spec.demSx + u * spec.demScale
        const dv = 1 - spec.demSy - (1 - v) * spec.demScale
        const h = sampleHeight(grid, du, dv)
        pos.setZ(i, ((h - obsElevM) / 1000) * RELIEF) // metres -> km, exaggerated
      }
      pos.needsUpdate = true
      geo.computeVertexNormals()
    }
    return geo
  }, [grid, seg, spec, obsElevM])

  useEffect(() => {
    return () => {
      geometry.dispose()
      material.dispose()
      texture.dispose()
    }
  }, [geometry, material, texture])

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

interface Bundle {
  obsElevM: number
  tiles: ReadyTile[]
}

/**
 * 3D ground under the observer: Esri World Imagery draped over real elevation
 * (AWS Terrarium DEM), so mountains, coasts and canyons rise in relief.
 * Everything for the location is preloaded, then the whole ground is mounted at
 * once — no tile-by-tile pop-in. Brightness follows the Sun's altitude (dark at
 * night) and dims in totality.
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

  // Preload imagery + elevation for every tile of every ring, plus the
  // observer's ground elevation (the datum the relief is referenced to), then
  // publish them together. Stale loads from a previous location are discarded
  // and their textures freed.
  const [bundle, setBundle] = useState<Bundle | null>(null)
  useEffect(() => {
    let cancelled = false

    const specs = LAYERS.flatMap((l) =>
      tileGrid(latDeg, lonDeg, l.imgZ, l.demZ, l.n).map((spec) => ({
        spec,
        seg: l.seg,
        yOff: l.yOff,
      })),
    )

    const ot = observerTile(latDeg, lonDeg, 14)
    const obsP = loadHeightGrid(TERRAIN_URL(ot.z, ot.ty, ot.tx)).then((g) =>
      g ? sampleHeight(g, ot.fx, 1 - ot.fy) : 0,
    )

    const tileP = specs.map(async (s): Promise<ReadyTile | null> => {
      const [texture, grid] = await Promise.all([
        loadTexture(s.spec.url),
        loadHeightGrid(s.spec.demUrl),
      ])
      if (!texture) return null // offline / 404: dark backdrop shows through
      return { ...s, texture, grid }
    })

    Promise.all([obsP, Promise.all(tileP)]).then(([obsElevM, loaded]) => {
      const tiles = loaded.filter((t): t is ReadyTile => t !== null)
      if (cancelled) {
        tiles.forEach((t) => t.texture.dispose()) // unmount won't run; free here
        return
      }
      setBundle({ obsElevM, tiles })
    })

    return () => {
      cancelled = true
    }
  }, [latDeg, lonDeg])

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

  if (!bundle) {
    return (
      <Html center zIndexRange={[20, 0]}>
        <span className="surface-loading">Loading terrain…</span>
      </Html>
    )
  }

  return (
    <group ref={groupRef}>
      {bundle.tiles.map((tile) => (
        <GroundTile key={tile.spec.key} {...tile} obsElevM={bundle.obsElevM} />
      ))}
    </group>
  )
}
