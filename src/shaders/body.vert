// Shared vertex shader for all sphere bodies.
varying vec3 vWorldPos;
varying vec3 vNormalW;
varying vec3 vObjPos;
varying vec2 vUv;

#include <common>
#include <logdepthbuf_pars_vertex>

void main() {
  vUv = uv;
  vObjPos = position;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  // Uniform scale only, so modelMatrix rotation is safe for normals.
  vNormalW = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
  #include <logdepthbuf_vertex>
}
