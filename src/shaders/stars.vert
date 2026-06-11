// Bright named stars as fixed-size points.
attribute float aSize;
attribute vec3 aColor;

uniform float uPixelRatio;

varying vec3 vColor;

#include <common>
#include <logdepthbuf_pars_vertex>

void main() {
  vColor = aColor;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * uPixelRatio;
  #include <logdepthbuf_vertex>
}
