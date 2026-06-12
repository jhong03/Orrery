// Earth surface: day/night blend across a ~6 deg twilight band, city lights,
// ocean sun glint (mask derived from the day map until proper specular maps
// land), and cloud shadows projected from the cloud layer.
uniform sampler2D uDayMap;
uniform sampler2D uNightMap;
uniform sampler2D uCloudMap;
uniform vec3 uSunPos;
uniform vec3 uSunColor;
uniform float uCloudShift; // cloud drift, in uv.x
uniform vec3 uPoleW;       // world-space north pole direction
uniform float uAmbient;
// Solar-eclipse shadow: the Moon occludes the Sun's disc.
uniform float uOccOn;
uniform vec3 uOccPos;      // occluder center, world
uniform float uOccRadius;  // occluder radius, world units
uniform float uSunRadiusW; // Sun radius, world units

varying vec3 vWorldPos;
varying vec3 vNormalW;
varying vec2 vUv;

#include <common>
#include <logdepthbuf_pars_fragment>

// Fraction of the Sun's disc hidden by the occluder, seen from p.
// Linear in angular separation: a soft penumbra ramping to the umbra core.
float sunOcclusion(vec3 p) {
  if (uOccOn < 0.5) return 0.0;
  vec3 toSun = uSunPos - p;
  vec3 toOcc = uOccPos - p;
  float dSun = length(toSun);
  float dOcc = length(toOcc);
  if (dOcc > dSun) return 0.0;
  float aSun = asin(clamp(uSunRadiusW / dSun, 0.0, 1.0));
  float aOcc = asin(clamp(uOccRadius / dOcc, 0.0, 1.0));
  float sep = acos(clamp(dot(toSun / dSun, toOcc / dOcc), -1.0, 1.0));
  float f = clamp((aSun + aOcc - sep) / (2.0 * aSun), 0.0, 1.0);
  // An occluder smaller than the Sun's disc caps coverage (annular case).
  float cap = min((aOcc * aOcc) / (aSun * aSun), 1.0);
  return min(f, cap);
}

void main() {
  #include <logdepthbuf_fragment>

  vec3 N = normalize(vNormalW);
  vec3 sunDir = normalize(uSunPos - vWorldPos);
  vec3 V = normalize(cameraPosition - vWorldPos);
  float mu = dot(N, sunDir);

  // ~6 degree twilight band (sin 6 deg ~ 0.105).
  float day = smoothstep(-0.105, 0.105, mu);
  float lambert = clamp(mu, 0.0, 1.0);

  vec3 dayCol = texture2D(uDayMap, vUv).rgb;
  vec3 nightCol = texture2D(uNightMap, vUv).rgb;

  // Local east/north tangents for projecting the cloud shadow.
  vec3 east = normalize(cross(uPoleW, N));
  vec3 northT = cross(N, east);

  // Clouds drift in longitude; shadows are cast slightly away from the Sun.
  vec2 cloudUv = vec2(vUv.x + uCloudShift, vUv.y);
  vec2 shadowOff = vec2(-dot(sunDir, east), dot(sunDir, northT)) * 0.004;
  float cloudShadow = texture2D(uCloudMap, cloudUv + shadowOff).r;

  vec3 surface = dayCol * uSunColor * day * lambert;
  surface *= 1.0 - cloudShadow * 0.45 * day;

  // The Moon's shadow: penumbra dims, the umbra spot goes nearly black.
  float ecl = sunOcclusion(vWorldPos);
  surface *= 1.0 - 0.94 * ecl * ecl * (3.0 - 2.0 * ecl); // smoothstep-shaped

  // Ocean glint: day map's blue dominance stands in for a specular mask.
  float ocean = clamp((dayCol.b - max(dayCol.r, dayCol.g)) * 4.0, 0.0, 1.0);
  ocean = max(ocean, smoothstep(0.0, 0.2, dayCol.b - dayCol.r) * 0.5);
  vec3 H = normalize(sunDir + V);
  float glint = pow(clamp(dot(N, H), 0.0, 1.0), 140.0) * ocean * day;
  surface += uSunColor * glint * 0.9;

  // City lights on the night side, dimmed under cloud cover.
  float night = 1.0 - day;
  vec3 lights = nightCol * vec3(1.0, 0.85, 0.62) * 1.7;
  lights *= 1.0 - texture2D(uCloudMap, cloudUv).r * 0.85;
  surface += lights * night;

  surface += dayCol * uAmbient;

  gl_FragColor = vec4(surface, 1.0);
}
