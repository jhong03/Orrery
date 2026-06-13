import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { Suspense, useEffect, useRef } from 'react'
import { Vector3 } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'

import { COMET_IDS, type CometId } from '../data/smallBodies'
import { cometTailViewKm } from './cometView'
import { useSelectionStore } from '../state/selectionStore'
import { useSettingsStore } from '../state/settingsStore'
import { useTimeStore } from '../state/timeStore'
import { kmToSceneUnits, toSceneRelative } from '../utils/frame'
import { AsteroidBelt } from './AsteroidBelt'
import { Comet } from './bodies/Comet'
import { Earth } from './bodies/Earth'
import { Jupiter } from './bodies/Jupiter'
import { MinorBody } from './bodies/MinorBody'
import { Neptune } from './bodies/Neptune'
import { Planet } from './bodies/Planet'
import { Saturn } from './bodies/Saturn'
import { Sun } from './bodies/Sun'
import { Uranus } from './bodies/Uranus'
import { frame, updateFrame } from './frameState'
import { useSurfaceStore } from '../state/surfaceStore'
import { OrbitLines } from './OrbitLines'
import { ShadowCones } from './ShadowCones'
import { Starfield } from './Starfield'
import { TouchTimeScrub } from './TouchTimeScrub'

/** Dev-only: exposes the three.js scene/gl/camera for the headless debug scripts. */
function DevExpose() {
  const scene = useThree((s) => s.scene)
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)
  useEffect(() => {
    if (import.meta.env.DEV) {
      Object.assign(window as object, { __scene: scene, __gl: gl, __camera: camera })
    }
  }, [scene, gl, camera])
  return null
}

/** Advances the simulation clock from real elapsed time. Runs first. */
function TimeTicker() {
  const advance = useTimeStore((s) => s.advance)
  useFrame((_, delta) => {
    // Clamp dt so returning from a background tab doesn't teleport the clock.
    advance(Math.min(delta, 0.25))
  }, -30)
  return null
}

/** Computes ephemeris + view state exactly once per frame. Runs second. */
function EphemerisDriver() {
  useFrame(() => {
    updateFrame(useTimeStore.getState().jd, useSettingsStore.getState().scaleMode)
  }, -20)
  return null
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

const FLIGHT_SECONDS = 1.8

/**
 * Camera flights and floating-origin rebasing.
 *
 * While focusedBody !== originBody a flight is in progress: the camera eases
 * toward the destination body (slerped direction, log-interpolated distance).
 * On arrival the render origin is rebased to the destination and the camera
 * is re-expressed relative to it, so nothing visually jumps.
 */
function FlightRig() {
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null

  const flight = useRef({
    active: false,
    t: 0,
    handledSeq: 0,
    fromTarget: new Vector3(),
    fromDir: new Vector3(),
    fromDist: 0,
  })
  const tmp = useRef({
    dest: new Vector3(),
    endDir: new Vector3(),
    dir: new Vector3(),
    target: new Vector3(),
    sun: new Vector3(),
  })

  const prefersReducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // Snap camera distance when the scale mode changes (radii/distances jump).
  const scaleMode = useSettingsStore((s) => s.scaleMode)
  useEffect(() => {
    const { focusedBody, originBody } = useSelectionStore.getState()
    if (focusedBody !== originBody) return // flight in progress will handle it
    // Ensure frame data is fresh: on mount this effect runs before the first frame.
    updateFrame(useTimeStore.getState().jd, scaleMode)
    const radius = kmToSceneUnits(frame.view[focusedBody].radiusKm)
    const dir = camera.position.clone().normalize()
    if (dir.lengthSq() < 1e-12) dir.set(0.4, 0.25, 1).normalize()
    camera.position.copy(dir.multiplyScalar(radius * 6))
    if (controls) {
      controls.target.set(0, 0, 0)

      controls.minDistance = radius * 1.4
      controls.update()
    }
  }, [scaleMode, camera, controls])

  useFrame((_, delta) => {
    const sel = useSelectionStore.getState()
    const f = flight.current
    const v = tmp.current

    if (sel.flightSeq === f.handledSeq && !f.active) return

    // Destination placement, re-evaluated every frame because bodies move.
    const origin = frame.view[sel.originBody].pos
    toSceneRelative(frame.view[sel.focusedBody].pos, origin, v.dest)
    const destRadius = kmToSceneUnits(frame.view[sel.focusedBody].radiusKm)

    let endDist: number
    if (sel.systemView) {
      endDist = toSceneRelative(frame.view.neptune.pos, origin, v.endDir).length() * 1.35
      v.endDir.set(0.0, 0.82, 0.57).normalize()
    } else {
      // Comets: stand back far enough to frame the whole tail (or at least
      // the coma when the comet is dormant).
      const isComet = COMET_IDS.includes(sel.focusedBody as (typeof COMET_IDS)[number])
      if (isComet) {
        const tailUnits = kmToSceneUnits(cometTailViewKm(sel.focusedBody as CometId))
        endDist = Math.max(destRadius * 45, tailUnits * 0.85)
      } else {
        endDist = destRadius * 6
      }
      // Arrive on the sunlit side, slightly above the ecliptic.
      toSceneRelative(frame.view.sun.pos, origin, v.sun)
      v.endDir.copy(v.sun).sub(v.dest)
      if (v.endDir.lengthSq() < 1e-9) v.endDir.set(0.4, 0.25, 1)
      v.endDir.normalize()
      v.endDir.y += 0.35
      v.endDir.normalize()
    }

    if (!f.active) {
      f.active = true
      f.t = 0
      f.fromTarget.copy(controls ? controls.target : new Vector3())
      f.fromDir.copy(camera.position).sub(f.fromTarget)
      f.fromDist = Math.max(f.fromDir.length(), 1e-6)
      f.fromDir.normalize()
    }

    f.t += delta / FLIGHT_SECONDS
    const p = prefersReducedMotion ? 1 : easeInOutCubic(Math.min(f.t, 1))
    const arrived = f.t >= 1 || prefersReducedMotion

    v.target.lerpVectors(f.fromTarget, v.dest, p)
    v.dir.lerpVectors(f.fromDir, v.endDir, p).normalize()
    const dist = Math.exp((1 - p) * Math.log(f.fromDist) + p * Math.log(endDist))

    camera.position.copy(v.target).addScaledVector(v.dir, dist)
    if (controls) {
      controls.target.copy(v.target)
    }

    if (arrived) {
      f.active = false
      f.handledSeq = sel.flightSeq
      // Rebase the floating origin to the destination. BodyMeshes runs after
      // this (priority 0 > -10), so the scene and camera move together.
      sel.rebaseOrigin(sel.focusedBody)
      camera.position.sub(v.dest)
      if (controls) {
        controls.target.set(0, 0, 0)

        controls.minDistance = destRadius * 1.4
        controls.update()
      }
    } else {
      controls?.update()
    }
  }, -10)

  return null
}

export function SystemScene() {
  // In surface mode the clock and ephemeris keep running (the sky needs
  // them) but everything orbital unmounts — including OrbitControls and
  // the drei Html labels, which would otherwise stay in the DOM.
  const surfaceActive = useSurfaceStore((s) => s.active)
  return (
    <>
      <color attach="background" args={['#02030a']} />
      <DevExpose />
      <TimeTicker />
      <EphemerisDriver />
      {surfaceActive ? null : <OrbitContent />}
    </>
  )
}

function OrbitContent() {
  return (
    <>
      <FlightRig />
      <Suspense fallback={null}>
        <Starfield />
        <Sun />
        <Planet id="mercury" />
        <Planet id="venus" />
        <Earth />
        <Planet id="moon" declutterAgainst="earth" eclipseOccluder="earth" />
        <Planet id="mars" />
        <Jupiter />
        <Saturn />
        <Uranus />
        <Neptune />
        {/* Galilean moons + Titan */}
        <MinorBody id="io" declutterAgainst="jupiter" declutterPx={44} />
        <MinorBody id="europa" declutterAgainst="jupiter" declutterPx={44} />
        <MinorBody id="ganymede" declutterAgainst="jupiter" declutterPx={44} />
        <MinorBody id="callisto" declutterAgainst="jupiter" declutterPx={44} />
        <MinorBody id="titan" declutterAgainst="saturn" declutterPx={44} />
        {/* Named belt asteroids */}
        <MinorBody id="ceres" />
        <MinorBody id="vesta" />
        {/* Comets with GPU tails */}
        <Comet id="halley" />
        <Comet id="encke" />
        <Comet id="cg67p" />
        <Comet id="neowise" />
        <AsteroidBelt />
        <ShadowCones />
      </Suspense>
      <OrbitLines />
      <OrbitControls makeDefault enableDamping dampingFactor={0.08} />
      <TouchTimeScrub />
    </>
  )
}
