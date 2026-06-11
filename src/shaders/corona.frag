// Additive corona billboard around the Sun: radial falloff with subtle
// angular streaks. HDR output feeds the bloom pass.
uniform float uTime;

varying vec2 vUv;

#include <common>
#include <logdepthbuf_pars_fragment>

float hash(float n) { return fract(sin(n) * 43758.5453123); }

void main() {
  #include <logdepthbuf_fragment>

  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  if (r > 1.0) discard;

  float ang = atan(p.y, p.x);

  // Streaks: a few overlapping angular frequencies, drifting very slowly.
  float streak = 0.78 +
                 0.22 * (0.5 * sin(ang * 9.0 + uTime * 0.05) +
                         0.3 * sin(ang * 17.0 - uTime * 0.03) +
                         0.2 * sin(ang * 29.0 + uTime * 0.02));

  // The sphere occupies the inner ~28% of the quad; tight falloff outside it.
  float fall = exp(-(r - 0.28) * 11.0);
  float core = smoothstep(0.24, 0.31, r); // hide under the disc itself
  float a = clamp(fall * streak, 0.0, 1.0) * core;

  vec3 col = mix(vec3(1.0, 0.55, 0.18), vec3(1.0, 0.86, 0.6), a) * a * 1.1;
  gl_FragColor = vec4(col, 1.0);
}
