import { Billboard } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { AdditiveBlending, ShaderMaterial } from 'three'

import bodyVert from '../../shaders/body.vert'
import coronaFrag from '../../shaders/corona.frag'
import coronaVert from '../../shaders/corona.vert'
import sunFrag from '../../shaders/sun.frag'
import { BodyAnchor } from '../BodyAnchor'

/**
 * The Sun: animated granulation shader (HDR output feeds bloom), an additive
 * corona billboard, and the system's only real light source (inverse-square
 * point light for any standard materials, e.g. M3 asteroids).
 */
export function Sun() {
  const surfaceMat = useRef<ShaderMaterial>(null)
  const coronaMat = useRef<ShaderMaterial>(null)

  const surfaceUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uEmissive: { value: 5.0 },
    }),
    [],
  )
  const coronaUniforms = useMemo(() => ({ uTime: { value: 0 } }), [])

  useFrame((state) => {
    // Real elapsed time: granulation is ornamental and must not strobe when
    // the simulation runs at days per second.
    // NB: always write through material.uniforms — R3F clones the uniform
    // descriptors from the `uniforms` prop, so the memoized objects are not
    // the live ones for scalar values.
    const t = state.clock.elapsedTime
    if (surfaceMat.current) surfaceMat.current.uniforms.uTime.value = t
    if (coronaMat.current) coronaMat.current.uniforms.uTime.value = t
  })

  return (
    <BodyAnchor id="sun">
      <mesh>
        <sphereGeometry args={[1, 64, 32]} />
        <shaderMaterial
          ref={surfaceMat}
          vertexShader={bodyVert}
          fragmentShader={sunFrag}
          uniforms={surfaceUniforms}
        />
      </mesh>
      {/* Corona: the quad spans 7 radii; the shader's falloff starts at
          r = 0.28 where the disc ends. */}
      <Billboard>
        <mesh scale={7} renderOrder={1}>
          <planeGeometry args={[1, 1]} />
          <shaderMaterial
            ref={coronaMat}
            vertexShader={coronaVert}
            fragmentShader={coronaFrag}
            uniforms={coronaUniforms}
            transparent
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      </Billboard>
      <pointLight intensity={4.5e10} decay={2} distance={0} color="#fff5ec" />
    </BodyAnchor>
  )
}
