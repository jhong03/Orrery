import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { AdditiveBlending, DoubleSide, Vector3, type Mesh, type ShaderMaterial } from 'three'

import { frame } from '../frameState'
import { surfaceEvents } from './surfaceEvents'

/**
 * The solar corona, seen only during a total eclipse: a soft pearly-white
 * halo that the Moon's black disc sits inside. Fades in sharply as occlusion
 * approaches 1, so it appears just as the diamond ring closes. Lives in the
 * celestial group, pinned at the Sun's position (the closer Moon disc covers
 * the centre, leaving the ring).
 */
const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const FRAG = /* glsl */ `
uniform float uIntensity;
varying vec2 vUv;
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  if (r > 1.0) discard;
  // Bright near the limb (~0.18 of the quad = a few solar radii), long falloff.
  float halo = smoothstep(1.0, 0.16, r);
  float inner = smoothstep(0.32, 0.18, r);
  float a = (halo * 0.6 + inner * 0.8) * uIntensity;
  vec3 col = mix(vec3(1.0, 0.95, 0.85), vec3(1.0), inner);
  gl_FragColor = vec4(col * a, a);
}
`

/** Sun disc is ~0.0026 rad; the corona quad spans ~8 solar radii. */
const SUN_DIST = 1e7

export function Corona() {
  const meshRef = useRef<Mesh>(null)
  const matRef = useRef<ShaderMaterial>(null)
  const uniforms = useMemo(() => ({ uIntensity: { value: 0 } }), [])
  const dir = useRef(new Vector3())

  useFrame(() => {
    const u = matRef.current?.uniforms
    const mesh = meshRef.current
    if (!u || !mesh) return
    // Only during near-total coverage; ramp hard so it reads as totality.
    const occ = surfaceEvents.solarOcclusion
    const intensity = Math.max(0, (occ - 0.93) / 0.07)
    u.uIntensity.value = intensity * intensity
    mesh.visible = intensity > 0

    if (mesh.visible) {
      // Sun direction in the celestial group's LOCAL frame is just the
      // ecliptic-three Sun direction (the group rotation is applied above us).
      const s = frameSunDir(dir.current)
      const radius = SUN_DIST * 0.0026 * 8 // ~8 solar radii
      mesh.position.copy(s).multiplyScalar(SUN_DIST)
      mesh.scale.setScalar(radius)
      mesh.lookAt(0, 0, 0)
    }
  })

  return (
    <mesh ref={meshRef} renderOrder={-51} visible={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={uniforms}
        transparent
        side={DoubleSide}
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </mesh>
  )
}

function frameSunDir(out: Vector3): Vector3 {
  const d = frame.sys.sun
  const e = frame.sys.earth
  // Ecliptic -> three (x, z, -y), normalized.
  return out.set(d.x - e.x, d.z - e.z, -(d.y - e.y)).normalize()
}
