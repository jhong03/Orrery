/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import glsl from 'vite-plugin-glsl'

export default defineConfig({
  plugins: [react(), glsl()],
  build: {
    // three.js core + drei + postprocessing (~1.2 MB) are all needed on the
    // first rendered frame, so the vendor chunk is irreducibly large for a 3D
    // app; Rolldown keeps them together because they always co-load. App code
    // and on-demand subsystems (surface, events) are split out separately, so
    // this limit reflects the real vendor floor rather than a fixable warning.
    chunkSizeWarningLimit: 1300,
    rollupOptions: {
      output: {
        // Split the heavy, rarely-changing libraries into their own chunks so
        // app-code edits don't bust them from the browser cache, and the big
        // three.js core loads in parallel with the rest.
        manualChunks(rawId) {
          const id = rawId.replace(/\\/g, '/')
          if (!id.includes('node_modules')) return
          if (id.includes('astronomy-engine')) return 'astronomy'
          if (id.includes('/three/') || id.includes('three-stdlib')) return 'three'
          if (id.includes('@react-three') || id.includes('postprocessing')) return 'r3f'
          if (id.includes('/react') || id.includes('scheduler')) return 'react'
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
