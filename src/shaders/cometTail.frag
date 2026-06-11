uniform vec3 uColor;

varying float vT;
varying float vFade;

#include <common>
#include <logdepthbuf_pars_fragment>

void main() {
  #include <logdepthbuf_fragment>

  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(p, p);
  if (r2 > 1.0) discard;
  // Faint individual points that integrate into a smooth beam in aggregate.
  float a = exp(-r2 * 2.2) * vFade * 0.55;
  gl_FragColor = vec4(uColor * a * 1.7, a);
}
