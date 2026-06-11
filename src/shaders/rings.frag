// Saturn's rings: radial color/alpha strip texture, lit on both sides with
// transmission when backlit, and the planet's shadow computed analytically
// (sphere occlusion along the fragment->Sun ray).
uniform sampler2D uRingMap;
uniform vec3 uSunPos;
uniform vec3 uSunColor;
uniform vec3 uPlanetCenter; // world
uniform float uPlanetRadius; // world units

varying vec3 vWorldPos;
varying vec3 vNormalW;
varying vec2 vUv; // x = radial coordinate 0..1 (inner..outer)

#include <common>
#include <logdepthbuf_pars_fragment>

void main() {
  #include <logdepthbuf_fragment>

  vec4 ring = texture2D(uRingMap, vec2(vUv.x, 0.5));
  if (ring.a < 0.02) discard;

  vec3 N = normalize(vNormalW);
  vec3 sunDir = normalize(uSunPos - vWorldPos);
  vec3 V = normalize(cameraPosition - vWorldPos);

  // Planet shadow: does the segment toward the Sun pass through the sphere?
  float shadow = 1.0;
  vec3 toC = uPlanetCenter - vWorldPos;
  float along = dot(toC, sunDir);
  if (along > 0.0) {
    float perp = length(toC - sunDir * along);
    // Soft penumbra edge (~3% of the radius).
    shadow = smoothstep(uPlanetRadius * 0.99, uPlanetRadius * 1.045, perp);
  }

  float mu = dot(N, sunDir);
  float facing = abs(mu); // lit from either face
  // Transmission: backlit ring glows faintly through.
  float trans = clamp(-sign(mu * dot(N, V)), 0.0, 1.0) * 0.35;
  float lighting = clamp(facing + trans * (1.0 - facing), 0.04, 1.0);

  vec3 col = ring.rgb * uSunColor * lighting * shadow;
  // Unlit ambient so the shadowed arc is not pure black.
  col += ring.rgb * 0.012;

  gl_FragColor = vec4(col, ring.a);
}
