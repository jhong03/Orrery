// Atmosphere rim shell, rendered on the BACK faces of a slightly larger
// sphere with additive blending. Blue scattering on the lit limb shifting to
// orange exactly along the terminator (the sunset ring), plus a faint
// backlit halo when the Sun is behind the body.
uniform vec3 uSunPos;
uniform vec3 uDayColor;     // rayleigh blue
uniform vec3 uSunsetColor;  // terminator orange
uniform float uIntensity;

varying vec3 vWorldPos;
varying vec3 vNormalW;

#include <common>
#include <logdepthbuf_pars_fragment>

void main() {
  #include <logdepthbuf_fragment>

  // Back faces: the geometric normal points away from the camera.
  vec3 N = normalize(vNormalW);
  vec3 V = normalize(cameraPosition - vWorldPos);
  vec3 sunDir = normalize(uSunPos - vWorldPos);

  float mu = dot(N, sunDir);

  // Rim profile: strongest at the limb, vanishing at the disc center.
  float rim = pow(clamp(1.0 + dot(V, N), 0.0, 1.0), 3.5);

  // Sunset ring: orange exactly where mu ~ 0, blue well inside the day side.
  vec3 hue = mix(uSunsetColor, uDayColor, smoothstep(0.02, 0.38, mu));

  // Day-side visibility, with a softened fade past the terminator.
  float lit = smoothstep(-0.22, 0.12, mu);

  // Backlit halo: thin bright ring when looking at the night side with the
  // Sun behind the planet (forward scattering through the atmosphere).
  float forward = pow(clamp(dot(-V, sunDir), 0.0, 1.0), 14.0);
  float halo = forward * pow(clamp(1.0 + dot(V, N), 0.0, 1.0), 1.8) * 0.8;

  vec3 col = hue * (rim * lit + halo) * uIntensity;
  gl_FragColor = vec4(col, 1.0);
}
