import { useTexture } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useMemo } from 'react'
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Quaternion,
  SRGBColorSpace,
} from 'three'
import { MakeTime, RotateVector, Rotation_EQJ_ECL, Vector } from 'astronomy-engine'

import { BRIGHT_STARS } from '../data/stars'
import type { BodyAxes } from '../ephemeris/rotation'
import { asset } from '../utils/asset'
import { axesToQuaternion } from '../utils/frame'
import starsFrag from '../shaders/stars.frag'
import starsVert from '../shaders/stars.vert'

const SKY_RADIUS = 2e7 // scene units; far plane is 1e8
const STAR_RADIUS = 1.7e7

/**
 * Scene orientation of the J2000 equatorial frame: the star map and the
 * bright-star coordinates are both expressed in EQJ, so one shared group
 * rotation places them correctly relative to the ecliptic.
 */
function eqjQuaternion(): Quaternion {
  const rot = Rotation_EQJ_ECL()
  const t = MakeTime(0)
  const rx = RotateVector(rot, new Vector(1, 0, 0, t))
  const ry = RotateVector(rot, new Vector(0, 1, 0, t))
  const rz = RotateVector(rot, new Vector(0, 0, 1, t))
  const axes: BodyAxes = {
    xAxis: { x: rx.x, y: rx.y, z: rx.z },
    yAxis: { x: ry.x, y: ry.y, z: ry.z },
    zAxis: { x: rz.x, y: rz.y, z: rz.z },
  }
  return axesToQuaternion(axes, new Quaternion())
}

export function Starfield() {
  const milkyWay = useTexture(asset('/textures/stars_milky_way.jpg'), (t) => {
    t.colorSpace = SRGBColorSpace
    t.anisotropy = 4
  })
  const dpr = useThree((s) => s.viewport.dpr)

  const quaternion = useMemo(() => eqjQuaternion(), [])

  const starGeometry = useMemo(() => {
    const n = BRIGHT_STARS.length
    const positions = new Float32Array(n * 3)
    const colors = new Float32Array(n * 3)
    const sizes = new Float32Array(n)
    BRIGHT_STARS.forEach((s, i) => {
      const ra = (s.raH / 24) * Math.PI * 2
      const dec = (s.decDeg * Math.PI) / 180
      // EQJ unit vector mapped into the group's local (texture) frame:
      // local = (x, z, -y) of the equatorial vector.
      const x = Math.cos(dec) * Math.cos(ra)
      const y = Math.cos(dec) * Math.sin(ra)
      const z = Math.sin(dec)
      positions[i * 3] = x * STAR_RADIUS
      positions[i * 3 + 1] = z * STAR_RADIUS
      positions[i * 3 + 2] = -y * STAR_RADIUS
      colors[i * 3] = s.color[0]
      colors[i * 3 + 1] = s.color[1]
      colors[i * 3 + 2] = s.color[2]
      sizes[i] = Math.min(13, Math.max(3.5, 9.5 - 2.2 * s.mag))
    })
    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(positions, 3))
    geo.setAttribute('aColor', new BufferAttribute(colors, 3))
    geo.setAttribute('aSize', new BufferAttribute(sizes, 1))
    return geo
  }, [])

  const starUniforms = useMemo(() => ({ uPixelRatio: { value: dpr } }), [dpr])

  return (
    <group quaternion={quaternion}>
      {/* scale.x = -1 un-mirrors the texture for inside viewing. three flips
          winding for negative-determinant transforms, so BackSide is still
          the face visible from inside the sphere. */}
      <mesh scale={[-SKY_RADIUS, SKY_RADIUS, SKY_RADIUS]} renderOrder={-100}>
        <sphereGeometry args={[1, 64, 32]} />
        {/* HDR multiplier: the source map is dark and ACES crushes the lows. */}
        <meshBasicMaterial
          map={milkyWay}
          side={BackSide}
          depthWrite={false}
          color={[2.6, 2.7, 3.0]}
        />
      </mesh>
      <points geometry={starGeometry} renderOrder={-99}>
        <shaderMaterial
          vertexShader={starsVert}
          fragmentShader={starsFrag}
          uniforms={starUniforms}
          transparent
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </group>
  )
}
