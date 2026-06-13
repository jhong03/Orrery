import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { BackSide, Vector3, type ShaderMaterial } from 'three'

import { createEnuBasis, eclToEnu, enuBasisEcl } from '../../ephemeris/topocentric'
import type { Vec3Km } from '../../ephemeris/types'
import { useSurfaceStore } from '../../state/surfaceStore'
import { frame } from '../frameState'
import { surfaceEvents } from './surfaceEvents'

const DOME_RADIUS = 9e6 // inside the Sun disc (1e7); stars are at 1.7e7

const VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

/**
 * Analytic daytime sky: a blue zenith->horizon gradient that fades in with
 * the Sun's altitude, a warm sunrise/sunset glow that peaks as the Sun
 * crosses the horizon, and alpha that drops to zero at night so the stars
 * show through. uOcclusion (0..1) darkens it toward eerie totality twilight.
 */
const FRAG = /* glsl */ `
uniform vec3 uSunDir;     // observer frame: +x east, +y up, -z north
uniform float uOcclusion; // eclipse coverage 0..1
varying vec3 vDir;

void main() {
  vec3 dir = normalize(vDir);
  float up = clamp(dir.y, 0.0, 1.0);
  float sunAlt = uSunDir.y;

  float day = smoothstep(-0.10, 0.12, sunAlt);          // night -> day
  float dusk = exp(-pow(sunAlt * 6.0, 2.0));            // peaks at the horizon

  vec3 zenith = vec3(0.09, 0.27, 0.62);
  vec3 horizon = vec3(0.52, 0.66, 0.86);
  vec3 col = mix(horizon, zenith, pow(up, 0.42)) * day;

  float sunCos = max(dot(dir, uSunDir), 0.0);
  float lowSky = pow(1.0 - up, 2.5);
  vec3 warm = vec3(1.0, 0.42, 0.14);
  vec3 ember = vec3(0.95, 0.22, 0.08);
  // Golden hour: a broad warm wash toward the Sun plus a red band hugging
  // the horizon, both strongest as the Sun sits on the horizon.
  col += warm * (pow(sunCos, 3.0) * 0.9 + lowSky * 0.5) * dusk;
  col += ember * pow(max(sunCos, 0.0), 1.5) * lowSky * dusk;
  col += vec3(1.0, 0.9, 0.75) * pow(sunCos, 80.0) * day * 0.5;      // daytime halo

  float alpha = clamp(day + dusk * 0.6, 0.0, 1.0);
  col *= (1.0 - uOcclusion * 0.9);
  alpha *= (1.0 - uOcclusion * 0.8);

  gl_FragColor = vec4(col, alpha);
}
`

export function SkyDome() {
  const matRef = useRef<ShaderMaterial>(null)
  const uniforms = useMemo(
    () => ({ uSunDir: { value: new Vector3(0, 1, 0) }, uOcclusion: { value: 0 } }),
    [],
  )
  const tmp = useRef({
    basis: createEnuBasis(),
    d: { x: 0, y: 0, z: 0 } as Vec3Km,
    enu: { x: 0, y: 0, z: 0 } as Vec3Km,
  })

  useFrame(() => {
    const u = matRef.current?.uniforms
    if (!u) return
    const t = tmp.current
    const { latDeg, lonDeg } = useSurfaceStore.getState()
    enuBasisEcl(latDeg, lonDeg, frame.axes.earth, t.basis)
    t.d.x = frame.sys.sun.x - frame.sys.earth.x
    t.d.y = frame.sys.sun.y - frame.sys.earth.y
    t.d.z = frame.sys.sun.z - frame.sys.earth.z
    eclToEnu(t.d, t.basis, t.enu)
    const len = Math.hypot(t.enu.x, t.enu.y, t.enu.z)
    // Observer frame: x east, y up, -z north.
    ;(u.uSunDir.value as Vector3).set(t.enu.x / len, t.enu.z / len, -t.enu.y / len)
    u.uOcclusion.value = surfaceEvents.solarOcclusion
  })

  return (
    <mesh renderOrder={-60}>
      <sphereGeometry args={[DOME_RADIUS, 32, 16]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={uniforms}
        side={BackSide}
        transparent
        depthWrite={false}
      />
    </mesh>
  )
}
