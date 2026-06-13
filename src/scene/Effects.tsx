import { Bloom, EffectComposer, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'

import { useSettingsStore } from '../state/settingsStore'

/**
 * HDR post pipeline: selective bloom (the Sun's shader outputs ~5x HDR, so a
 * threshold of 1 picks up the Sun, corona and the brightest star cores),
 * a subtle vignette, and ACES filmic tone mapping at the end of the chain.
 * The Canvas is created with `flat` so this composer owns tone mapping.
 */
export function Effects() {
  const bloomIntensity = useSettingsStore((s) => s.bloomIntensity)
  return (
    <EffectComposer multisampling={4}>
      <Bloom
        mipmapBlur
        intensity={bloomIntensity}
        luminanceThreshold={1.0}
        luminanceSmoothing={0.25}
      />
      <Vignette offset={0.22} darkness={0.5} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  )
}
