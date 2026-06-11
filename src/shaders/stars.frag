varying vec3 vColor;

#include <common>
#include <logdepthbuf_pars_fragment>

void main() {
  #include <logdepthbuf_fragment>

  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float r = length(p);
  if (r > 1.0) discard;
  // Bright core with a soft falloff; slight HDR so the brightest stars bloom.
  float a = exp(-r * r * 3.2);
  gl_FragColor = vec4(vColor * a * 1.45, a);
}
