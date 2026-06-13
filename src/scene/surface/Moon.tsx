import { useTexture } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { forwardRef, useRef } from 'react'
import { Color, SRGBColorSpace, type Group, type MeshStandardMaterial } from 'three'

import { surfaceEvents } from './surfaceEvents'

const MOON_RADIUS_KM = 1737.4
const COPPER = new Color(0.5, 0.12, 0.04)

/**
 * The Moon as seen from the ground: a real textured sphere at its true
 * topocentric position, lit by the real Sun direction — phases, the new-moon
 * silhouette that covers the Sun in a solar eclipse, and the copper glow of a
 * total lunar eclipse (Earth's shadow, sunlight refracted through our
 * atmosphere) all emerge from geometry + the shared event state.
 */
export const Moon = forwardRef<Group>(function Moon(_props, ref) {
  const map = useTexture('/textures/moon.jpg', (t) => {
    t.colorSpace = SRGBColorSpace
    t.anisotropy = 8
  })
  const matRef = useRef<MeshStandardMaterial>(null)

  useFrame(() => {
    const mat = matRef.current
    if (!mat) return
    // Blood moon: as Earth's umbra covers it, fade in copper self-illumination
    // so the disc glows even though no direct sunlight reaches it.
    const e = surfaceEvents.lunarEclipse
    mat.emissive.copy(COPPER).multiplyScalar(e * e)
    mat.emissiveIntensity = 1
  })

  return (
    <group ref={ref}>
      <mesh scale={MOON_RADIUS_KM} renderOrder={-48}>
        <sphereGeometry args={[1, 48, 24]} />
        <meshStandardMaterial ref={matRef} map={map} roughness={1} metalness={0} />
      </mesh>
    </group>
  )
})
