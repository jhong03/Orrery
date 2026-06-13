import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { AdditiveBlending, BackSide, MathUtils, type Mesh, type ShaderMaterial } from 'three'

import { createEnuBasis, enuBasisEcl } from '../../ephemeris/topocentric'
import { jdToDate } from '../../ephemeris/time'
import { useSurfaceStore } from '../../state/surfaceStore'
import { frame } from '../frameState'
import { auroralBoundaryDeg, effectiveKp, fetchKp, geomagneticLatitudeDeg } from './spaceWeather'

const R = 6e5
const H = 3.2e5
const ARC = (115 * Math.PI) / 180

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

// Waving curtains: several layers of flowing value-noise drifting at
// different speeds and directions, so the shimmer never visibly repeats.
// Green at the base rising to crimson — the auroral emission stack (atomic
// oxygen green ~100 km, red above).
const FRAG = /* glsl */ `
uniform float uTime;
uniform float uIntensity;
varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

void main() {
  float x = vUv.x;
  float v = vUv.y;
  float t = uTime;

  // Three curtain layers: coarse slow sheets, mid folds, fine fast filaments,
  // each drifting horizontally at its own rate so the pattern keeps evolving.
  float c1 = fbm(vec2(x * 7.0 + t * 0.045, t * 0.12));
  float c2 = fbm(vec2(x * 19.0 - t * 0.085, t * 0.27 + 5.3));
  float c3 = fbm(vec2(x * 44.0 + t * 0.16, t * 0.55 + 11.7));
  // Sharpen each into distinct rays (bright bands separated by dark gaps).
  float curtain = pow(c1, 1.6) * 0.5 + pow(c2, 2.2) * 0.34 + pow(c3, 3.2) * 0.28;

  // A slow large-scale envelope travels along the arc: regions brighten and
  // fade like real substorm activity. Plus a gentle global flicker.
  float envelope = 0.45 + 0.55 * fbm(vec2(x * 2.3 - t * 0.05, t * 0.08));
  float flicker = 0.85 + 0.15 * noise(vec2(t * 1.7, 3.0));

  // Rays taper with height, and the upper edge frays via noise so the tops
  // are ragged rather than a clean line.
  float top = 0.30 + 0.18 * fbm(vec2(x * 9.0 - t * 0.1, 21.0));
  float vert = smoothstep(0.0, 0.07, v) * (1.0 - smoothstep(top, 1.0, v));
  float edge = smoothstep(0.0, 0.12, x) * smoothstep(1.0, 0.88, x);

  float a = curtain * envelope * flicker * vert * edge * uIntensity * 2.4;
  vec3 col = mix(vec3(0.2, 1.0, 0.5), vec3(0.85, 0.12, 0.5), smoothstep(0.1, 0.7, v));
  gl_FragColor = vec4(col * a, min(a, 1.0));
}
`

/**
 * Auroras driven by live NOAA planetary-Kp data. Visible when it is dark, the
 * observer's geomagnetic latitude is poleward of the Kp-dependent auroral
 * oval, and (for live Kp) sim time is near real now. The curtain is placed on
 * the horizon toward the nearer geomagnetic pole.
 */
export function Aurora() {
  const meshRef = useRef<Mesh>(null)
  const matRef = useRef<ShaderMaterial>(null)
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uIntensity: { value: 0 } }), [])
  const tmp = useRef({ basis: createEnuBasis() })

  // Kick off the (cached, fail-safe) Kp fetch once on mount.
  useEffect(() => {
    fetchKp(Date.now())
  }, [])

  useFrame((state) => {
    const u = matRef.current?.uniforms
    const mesh = meshRef.current
    if (!u || !mesh) return
    const t = tmp.current
    const { latDeg, lonDeg } = useSurfaceStore.getState()

    // Night factor.
    enuBasisEcl(latDeg, lonDeg, frame.axes.earth, t.basis)
    const sd = frame.sys.sun
    const se = frame.sys.earth
    const sunUp =
      ((sd.x - se.x) * t.basis.up.x + (sd.y - se.y) * t.basis.up.y + (sd.z - se.z) * t.basis.up.z) /
      Math.hypot(sd.x - se.x, sd.y - se.y, sd.z - se.z)
    const night = 1 - Math.min(1, Math.max(0, (sunUp + 0.02) / 0.1))

    const simMs = jdToDate(frame.jd).getTime()
    const kp = effectiveKp(simMs, Date.now())
    const boundary = auroralBoundaryDeg(kp)
    const geomagLat = geomagneticLatitudeDeg(latDeg, lonDeg)
    // Poleward of (boundary - 6) the oval starts to fill the sky.
    const poleward = MathUtils.clamp((Math.abs(geomagLat) - (boundary - 6)) / 10, 0, 1)
    const intensity = night * poleward * Math.min(1, 0.4 + kp / 9)

    u.uTime.value = state.clock.elapsedTime
    u.uIntensity.value = intensity
    mesh.visible = intensity > 0.01

    if (mesh.visible) {
      // Bearing to the matching geomagnetic pole (N pole for the N hemisphere).
      const D = Math.PI / 180
      const north = geomagLat >= 0
      const poleLat = (north ? 80.7 : -80.7) * D
      const poleLon = (north ? -72.7 : 107.3) * D
      const lat = latDeg * D
      const dlon = poleLon - lonDeg * D
      const bearing = Math.atan2(
        Math.sin(dlon) * Math.cos(poleLat),
        Math.cos(lat) * Math.sin(poleLat) - Math.sin(lat) * Math.cos(poleLat) * Math.cos(dlon),
      )
      // The cylinder arc is centred on +Z (south, azimuth 180). A Y-rotation
      // of φ shifts azimuth by −φ, so to centre it on the pole bearing:
      mesh.rotation.set(0, Math.PI - bearing, 0)
    }
  })

  return (
    <mesh ref={meshRef} renderOrder={-46} visible={false} position={[0, H / 2, 0]}>
      <cylinderGeometry args={[R, R, H, 96, 24, true, -ARC / 2, ARC]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={uniforms}
        transparent
        side={BackSide}
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </mesh>
  )
}
