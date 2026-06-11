// Generic planet surface: albedo map, smooth-band terminator, limb darkening,
// optional atmosphere rim, optional Saturn ring shadow (analytic projection).
uniform sampler2D uMap;
uniform vec3 uSunPos;       // world (camera-relative scene) position of the Sun
uniform vec3 uSunColor;     // linear RGB * intensity ("auto exposure" per body)
uniform float uTerminatorSoft; // half-width of the terminator blend, in mu
uniform float uLimbDarken;  // 0 = none, ~0.6 = strong (gas giants)
uniform vec3 uRimColor;
uniform float uRimStrength;
uniform float uAmbient;

uniform float uRingShadowOn;
uniform sampler2D uRingMap;
uniform vec3 uRingCenter;   // world
uniform vec3 uRingNormal;   // world, unit
uniform float uRingInner;   // world units
uniform float uRingOuter;

varying vec3 vWorldPos;
varying vec3 vNormalW;
varying vec2 vUv;

#include <common>
#include <logdepthbuf_pars_fragment>

float ringShadow(vec3 p, vec3 sunDir) {
  float denom = dot(sunDir, uRingNormal);
  if (abs(denom) < 1e-4) return 1.0;
  float t = dot(uRingCenter - p, uRingNormal) / denom;
  if (t <= 0.0) return 1.0;
  vec3 hit = p + sunDir * t - uRingCenter;
  float r = length(hit);
  if (r < uRingInner || r > uRingOuter) return 1.0;
  float u = (r - uRingInner) / (uRingOuter - uRingInner);
  float a = texture2D(uRingMap, vec2(u, 0.5)).a;
  return 1.0 - a * 0.88;
}

void main() {
  #include <logdepthbuf_fragment>

  vec3 N = normalize(vNormalW);
  vec3 sunDir = normalize(uSunPos - vWorldPos);
  vec3 V = normalize(cameraPosition - vWorldPos);

  float mu = dot(N, sunDir);
  float light = smoothstep(-uTerminatorSoft, uTerminatorSoft, mu) * clamp(mu, 0.0, 1.0);

  float muV = clamp(dot(N, V), 0.0, 1.0);
  float limb = 1.0 - uLimbDarken * (1.0 - muV);

  vec3 albedo = texture2D(uMap, vUv).rgb;
  vec3 col = albedo * uSunColor * light * limb;

  if (uRingShadowOn > 0.5) {
    col *= ringShadow(vWorldPos, sunDir);
  }

  // Atmosphere rim: fresnel-weighted, fading across the terminator.
  float fres = pow(1.0 - muV, 3.0);
  float rimLit = smoothstep(-0.15, 0.3, mu);
  col += uRimColor * uRimStrength * fres * rimLit;

  // Faint starlight so the night side reads as a silhouette, not a hole.
  col += albedo * uAmbient;

  gl_FragColor = vec4(col, 1.0);
}
