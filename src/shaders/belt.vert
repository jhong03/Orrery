// Asteroid belt instancing: each rock's circular Keplerian orbit is encoded
// in per-instance attributes and evaluated here — zero CPU cost per frame.
attribute vec3 aE1;      // orbit-plane basis vector 1 (scene axes)
attribute vec3 aE2;      // orbit-plane basis vector 2
attribute float aRadReal; // orbit radius, realistic mode (scene units)
attribute float aRadVis;  // orbit radius, visible mode (scene units)
attribute float aN;       // mean motion, rad/day (from TRUE a — correct speeds)
attribute float aPhase;   // mean longitude at J2000, rad
attribute float aSize;    // rock size, scene units
attribute float aTint;    // albedo variation [0,1]
attribute vec3 aSpinAxis; // tumble axis (unit)
attribute float aSpinRate; // tumble rad/day

uniform float uDays;  // jd - J2000
uniform float uMode;  // 0 = realistic, 1 = visible

varying float vLight;
varying float vTint;

#include <common>
#include <logdepthbuf_pars_vertex>

vec3 rotateAxisAngle(vec3 p, vec3 axis, float ang) {
  float c = cos(ang);
  float s = sin(ang);
  return p * c + cross(axis, p) * s + axis * dot(axis, p) * (1.0 - c);
}

void main() {
  float theta = aPhase + aN * uDays;
  float r = mix(aRadReal, aRadVis, uMode);
  vec3 center = r * (cos(theta) * aE1 + sin(theta) * aE2);

  float spin = aPhase * 37.0 + aSpinRate * uDays;
  vec3 local = rotateAxisAngle(position, aSpinAxis, spin) * aSize;
  vec3 nrm = rotateAxisAngle(normal, aSpinAxis, spin);

  vec3 world = center + local;

  // Heliocentric lambert: the Sun sits at the belt's local origin.
  vec3 sunDir = -normalize(center);
  vLight = max(dot(nrm, sunDir), 0.0) * 1.7 + 0.012;
  vTint = aTint;

  vec4 mv = viewMatrix * modelMatrix * vec4(world, 1.0);
  gl_Position = projectionMatrix * mv;
  #include <logdepthbuf_vertex>
}
