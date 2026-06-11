// Earth cloud layer: separate, slightly larger sphere. Luminance of the cloud
// map drives alpha; soft terminator; silver lining near the limb when backlit.
uniform sampler2D uCloudMap;
uniform vec3 uSunPos;
uniform vec3 uSunColor;
uniform float uCloudShift;

varying vec3 vWorldPos;
varying vec3 vNormalW;
varying vec2 vUv;

#include <common>
#include <logdepthbuf_pars_fragment>

void main() {
  #include <logdepthbuf_fragment>

  vec3 N = normalize(vNormalW);
  vec3 sunDir = normalize(uSunPos - vWorldPos);
  vec3 V = normalize(cameraPosition - vWorldPos);
  float mu = dot(N, sunDir);

  float a = texture2D(uCloudMap, vec2(vUv.x + uCloudShift, vUv.y)).r;

  // Slightly softer terminator than the surface: clouds catch grazing light.
  float light = smoothstep(-0.15, 0.15, mu) * clamp(mu * 0.85 + 0.15, 0.0, 1.0);

  // Forward-scatter "silver lining" when looking toward the Sun.
  float forward = pow(clamp(dot(V, sunDir) * -1.0, 0.0, 1.0), 6.0);
  float lining = forward * smoothstep(0.0, 0.25, abs(mu)) * 0.25;

  vec3 col = uSunColor * (light + lining);
  gl_FragColor = vec4(col, a * 0.92);
}
