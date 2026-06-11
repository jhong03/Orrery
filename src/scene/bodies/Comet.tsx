import { Billboard } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  Vector3,
  type ShaderMaterial,
} from 'three'

import { SMALL_BODIES, elementsAt, type CometId } from '../../data/smallBodies'
import { keplerPositionKm } from '../../ephemeris/kepler'
import { KM_PER_AU, vecLength, type Vec3Km } from '../../ephemeris/types'
import { useSelectionStore } from '../../state/selectionStore'
import { toSceneRelative } from '../../utils/frame'
import { mapHelioToView } from '../../utils/scale'
import cometTailFrag from '../../shaders/cometTail.frag'
import cometTailVert from '../../shaders/cometTail.vert'
import coronaVert from '../../shaders/corona.vert'
import { BodyAnchor } from '../BodyAnchor'
import { comaActivity, cometActivity, ION_TAIL_AU } from '../cometView'
import { frame } from '../frameState'

const COMA_FRAG = /* glsl */ `
uniform float uActivity;
varying vec2 vUv;
#include <common>
#include <logdepthbuf_pars_fragment>
void main() {
  #include <logdepthbuf_fragment>
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  if (r > 1.0) discard;
  float a = exp(-r * 4.0) * uActivity;
  gl_FragColor = vec4(vec3(0.75, 0.85, 1.0) * a * 1.6, a);
}
`


function tailGeometry(count: number, bias: number): BufferGeometry {
  const seeds = new Float32Array(count * 3)
  const ts = new Float32Array(count)
  let s = 12345
  const rand = () => {
    // Deterministic LCG so HMR/StrictMode double-mounts look identical.
    s = (s * 48271) % 2147483647
    return s / 2147483647
  }
  for (let i = 0; i < count; i++) {
    seeds[i * 3] = rand()
    seeds[i * 3 + 1] = rand()
    seeds[i * 3 + 2] = rand()
    ts[i] = Math.pow(rand(), bias) // denser near the nucleus
  }
  const geo = new BufferGeometry()
  geo.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3)) // unused
  geo.setAttribute('aSeed', new BufferAttribute(seeds, 3))
  geo.setAttribute('aT', new BufferAttribute(ts, 1))
  geo.boundingSphere = null
  return geo
}

const DUST_COLOR = new Color(1.0, 0.88, 0.62)
const ION_COLOR = new Color(0.45, 0.65, 1.0)

export interface CometProps {
  id: CometId
}

/**
 * A comet: clickable nucleus anchor, additive coma, and two GPU particle
 * tails — dust (curved, white-yellow, lagging the orbit) and ion (straight,
 * blue, exactly anti-sunward). Length and brightness scale with heliocentric
 * distance: invisible beyond ~4 au, dramatic near perihelion.
 */
export function Comet({ id }: CometProps) {
  const dustGeo = useMemo(() => tailGeometry(3600, 1.6), [])
  const ionGeo = useMemo(() => tailGeometry(2400, 1.3), [])

  const dustUniforms = useMemo(
    () => ({
      uNucleus: { value: new Vector3() },
      uAxis: { value: new Vector3() },
      uCurve: { value: new Vector3() },
      uSpread: { value: 1 },
      uActivity: { value: 0 },
      uPointScale: { value: 16000 },
      uTime: { value: 0 },
      uColor: { value: DUST_COLOR },
    }),
    [],
  )
  const ionUniforms = useMemo(
    () => ({
      uNucleus: { value: new Vector3() },
      uAxis: { value: new Vector3() },
      uCurve: { value: new Vector3() },
      uSpread: { value: 1 },
      uActivity: { value: 0 },
      uPointScale: { value: 13000 },
      uTime: { value: 0 },
      uColor: { value: ION_COLOR },
    }),
    [],
  )
  const comaUniforms = useMemo(() => ({ uActivity: { value: 0 } }), [])

  const comaRef = useRef<Group>(null)
  const ionMat = useRef<ShaderMaterial>(null)
  const dustMat = useRef<ShaderMaterial>(null)
  const comaMat = useRef<ShaderMaterial>(null)
  const tmp = useRef({
    helio: { x: 0, y: 0, z: 0 } as Vec3Km,
    helioTip: { x: 0, y: 0, z: 0 } as Vec3Km,
    viewTip: { x: 0, y: 0, z: 0 } as Vec3Km,
    nucleus: new Vector3(),
    tip: new Vector3(),
    vel: new Vector3(),
    viewA: { x: 0, y: 0, z: 0 } as Vec3Km,
    viewB: { x: 0, y: 0, z: 0 } as Vec3Km,
    a: new Vector3(),
    b: new Vector3(),
  })

  useFrame((state) => {
    const v = tmp.current
    const { originBody } = useSelectionStore.getState()
    const origin = frame.view[originBody].pos

    const helio = frame.sys[id]
    const rAu = vecLength(helio) / KM_PER_AU
    const act = cometActivity(rAu)

    toSceneRelative(frame.view[id].pos, origin, v.nucleus)

    // Tail tip in real space, then mapped through the active scale mode so
    // compression bends/shortens it consistently with everything else.
    const antiSun = 1 / Math.max(vecLength(helio), 1)
    const ionLenKm = act * ION_TAIL_AU * KM_PER_AU
    v.helioTip.x = helio.x + helio.x * antiSun * ionLenKm
    v.helioTip.y = helio.y + helio.y * antiSun * ionLenKm
    v.helioTip.z = helio.z + helio.z * antiSun * ionLenKm
    mapHelioToView(v.helioTip, frame.mode, v.viewTip)
    toSceneRelative(v.viewTip, origin, v.tip)
    v.tip.sub(v.nucleus) // ion axis, view units

    // Orbital velocity direction in view space (finite difference along the
    // orbit): the dust tail lags behind it.
    const el = elementsAt(SMALL_BODIES[id], frame.jd)
    keplerPositionKm(el, frame.jd - 0.25, v.helio)
    mapHelioToView(v.helio, frame.mode, v.viewA)
    toSceneRelative(v.viewA, origin, v.a)
    v.vel.copy(v.nucleus).sub(v.a) // forward along the orbit
    if (v.vel.lengthSq() < 1e-12) v.vel.set(0, 1, 0)

    // Write through the material refs: R3F clones uniform descriptors from
    // the `uniforms` prop, so scalar writes to the memoized objects are lost.
    const iu = ionMat.current?.uniforms
    const du = dustMat.current?.uniforms
    const cu = comaMat.current?.uniforms
    if (!iu || !du || !cu) return

    ;(iu.uNucleus.value as Vector3).copy(v.nucleus)
    ;(iu.uAxis.value as Vector3).copy(v.tip)
    ;(iu.uCurve.value as Vector3).set(0, 0, 0)
    iu.uSpread.value = v.tip.length() * 0.035
    iu.uActivity.value = act
    iu.uTime.value = state.clock.elapsedTime

    // Dust: ~60% of the ion length, bent backwards along the orbit (the
    // classic curved dust tail trailing the comet's motion).
    ;(du.uNucleus.value as Vector3).copy(v.nucleus)
    v.vel.normalize().multiplyScalar(-v.tip.length() * 0.3)
    ;(du.uAxis.value as Vector3).copy(v.tip).multiplyScalar(0.62)
    ;(du.uCurve.value as Vector3).copy(v.vel)
    du.uSpread.value = v.tip.length() * 0.05
    du.uActivity.value = act
    du.uTime.value = state.clock.elapsedTime

    const comaAct = comaActivity(rAu)
    cu.uActivity.value = comaAct
    if (comaRef.current) {
      // Coma sized relative to the (mode-dependent) nucleus anchor radius.
      const s = 6 + comaAct * 22
      comaRef.current.scale.setScalar(s)
    }
  })

  return (
    <>
      <BodyAnchor id={id}>
        {/* Real comet nuclei are among the darkest objects known. */}
        <mesh>
          <sphereGeometry args={[1, 16, 8]} />
          <meshBasicMaterial color={[0.13, 0.135, 0.15]} />
        </mesh>
        <Billboard ref={comaRef}>
          <mesh renderOrder={4}>
            <planeGeometry args={[1, 1]} />
            <shaderMaterial
              ref={comaMat}
              vertexShader={coronaVert}
              fragmentShader={COMA_FRAG}
              uniforms={comaUniforms}
              transparent
              blending={AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        </Billboard>
      </BodyAnchor>
      {/* Tails live at scene level (world space), not inside the scaled anchor. */}
      <points geometry={ionGeo} renderOrder={5} frustumCulled={false}>
        <shaderMaterial
          ref={ionMat}
          vertexShader={cometTailVert}
          fragmentShader={cometTailFrag}
          uniforms={ionUniforms}
          transparent
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </points>
      <points geometry={dustGeo} renderOrder={5} frustumCulled={false}>
        <shaderMaterial
          ref={dustMat}
          vertexShader={cometTailVert}
          fragmentShader={cometTailFrag}
          uniforms={dustUniforms}
          transparent
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </>
  )
}
