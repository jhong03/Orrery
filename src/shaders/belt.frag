varying float vLight;
varying float vTint;

#include <common>
#include <logdepthbuf_pars_fragment>

void main() {
  #include <logdepthbuf_fragment>

  vec3 brown = vec3(0.36, 0.3, 0.24);
  vec3 gray = vec3(0.32, 0.31, 0.3);
  vec3 albedo = mix(brown, gray, vTint);
  gl_FragColor = vec4(albedo * vLight, 1.0);
}
