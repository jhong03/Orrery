import { useTexture } from '@react-three/drei'
import { useEffect, useState } from 'react'
import { TextureLoader, type Texture } from 'three'

import { hiResTexturePath, type QualityPreset } from '../data/quality'
import { asset } from '../utils/asset'

const loader = new TextureLoader()

/**
 * Progressive texture: show the working-tier (2K) map immediately, then upgrade
 * to the hi-res (8K) variant in the background when the quality preset asks for
 * it. The body is visible at once and sharpens, instead of the whole mesh
 * blocking behind Suspense until the multi-megabyte 8K download finishes.
 *
 * `configure` MUST be a stable reference (declare it at module scope) — it is
 * an effect dependency, so an inline closure would reload the hi-res every
 * render. It runs on both the base and the upgraded texture.
 */
export function useProgressiveTexture(
  base: string,
  quality: QualityPreset,
  configure: (t: Texture) => void,
): Texture {
  // Suspends only on the small working-tier map.
  const baseTex = useTexture(asset(base), configure)
  const hiPath = hiResTexturePath(base, quality)
  const [hi, setHi] = useState<{ path: string; tex: Texture } | null>(null)

  useEffect(() => {
    if (!hiPath) return
    let cancelled = false
    let loaded: Texture | undefined
    loader.load(asset(hiPath), (t) => {
      if (cancelled) return void t.dispose()
      configure(t)
      loaded = t
      setHi({ path: hiPath, tex: t })
    })
    return () => {
      cancelled = true
      loaded?.dispose() // no longer the active map once hiPath changes/unmounts
    }
  }, [hiPath, configure])

  // Use the upgrade only while it still matches the requested hi-res path;
  // otherwise (preset lowered, or mid-swap) fall back to the base map.
  return hi && hi.path === hiPath ? hi.tex : baseTex
}
