// Comet tail particles, fully GPU-driven. Each particle has a random seed
// and a normalized distance t along the tail. The tail axis and curvature
// are uniforms computed per frame on the CPU (in view space, so scale-mode
// compression is already applied).
attribute vec3 aSeed; // uniform random in [0,1)^3
attribute float aT;   // density-biased distance along the tail, [0,1]

uniform vec3 uNucleus;  // world (camera-relative) position
uniform vec3 uAxis;     // tail direction * length, world units
uniform vec3 uCurve;    // quadratic bend (dust lag), world units
uniform float uSpread;  // lateral scatter at the tail end, world units
uniform float uActivity;
uniform float uPointScale;
uniform float uTime;

varying float vT;
varying float vFade;

#include <common>
#include <logdepthbuf_pars_vertex>

void main() {
  vT = aT;

  // Lateral basis perpendicular to the tail axis.
  vec3 dir = normalize(uAxis);
  vec3 up = abs(dir.y) > 0.93 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
  vec3 b1 = normalize(cross(dir, up));
  vec3 b2 = cross(dir, b1);

  // Slow outward drift makes the tail shimmer without CPU work.
  float drift = fract(aSeed.z + uTime * 0.02);
  float t = clamp(aT + drift * 0.06, 0.0, 1.0);

  float spread = uSpread * (0.06 + t);
  vec3 lateral = ((aSeed.x - 0.5) * b1 + (aSeed.y - 0.5) * b2) * 2.0 * spread;

  vec3 pos = uNucleus + uAxis * t + uCurve * t * t + lateral;

  vec4 mv = viewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;

  float size = uPointScale * (0.6 + 1.4 * t) * uActivity;
  gl_PointSize = clamp(size / max(-mv.z, 1.0), 1.0, 26.0);

  vFade = (1.0 - t * t) * uActivity;

  #include <logdepthbuf_vertex>
}
