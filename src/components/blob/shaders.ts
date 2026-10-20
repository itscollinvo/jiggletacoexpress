/**
 * GLSL for the album blob. GLSL is the language GPU shaders are written in.
 *
 * A shader is a tiny program the GPU runs in parallel:
 *   - the VERTEX shader runs once per point of the mesh and decides where
 *     that point ends up on screen. We use it to push points in and out
 *     along their normal, which is what makes a sphere wobble.
 *   - the FRAGMENT shader runs once per pixel and decides its color. We use
 *     it to paint a 3-color gradient from the album palette, plus a soft
 *     glowing rim.
 *
 * Values sent from JavaScript are "uniforms" (same for every vertex/pixel
 * in a frame). Values handed from the vertex to the fragment shader are
 * "varyings" (interpolated across each triangle).
 */

// 3D simplex noise by Ian McEwan & Stefan Gustavson (Ashima Arts), MIT
// license: https://github.com/ashima/webgl-noise
// Noise is "smooth randomness": nearby inputs give nearby outputs, so the
// surface ripples instead of looking jagged. Feeding time in as part of
// the input makes the ripples flow.
const simplexNoise = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 10.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.5 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 105.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
`;

export const vertexShader = /* glsl */ `
uniform float uTime;
uniform float uAmplitude;   // how far the surface moves
uniform float uFrequency;   // how many bumps fit around the sphere
uniform vec3 uPointer;      // cursor position on the sphere (local space)
uniform float uPointerStrength;

varying vec3 vNormal;
varying float vHeight;

${simplexNoise}

// Where a point on the unit sphere ends up after the wobble.
vec3 displace(vec3 p) {
  vec3 dir = normalize(p);
  float n = snoise(dir * uFrequency + vec3(0.0, 0.0, uTime));
  // Bulge toward the cursor: strongest right under it, fading to 0 by
  // ~0.9 units away. smoothstep gives a soft edge instead of a hard one.
  float d = distance(dir, normalize(uPointer));
  float bulge = uPointerStrength * (1.0 - smoothstep(0.0, 0.9, d));
  return dir * (1.0 + n * uAmplitude + bulge);
}

void main() {
  vec3 displaced = displace(position);

  // Moving the points breaks the sphere's original normals (the direction
  // each point faces), and lighting depends on them. Recompute: displace
  // two tiny steps along the surface, then the cross product of the two
  // edges is the new facing direction.
  vec3 tangent = normalize(cross(normal, vec3(0.0, 1.0, 0.001)));
  vec3 bitangent = normalize(cross(normal, tangent));
  float eps = 0.01;
  vec3 a = displace(position + tangent * eps);
  vec3 b = displace(position + bitangent * eps);
  vec3 newNormal = normalize(cross(a - displaced, b - displaced));

  vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
  // normalMatrix turns the normal into "view space" (relative to the
  // camera), which makes the lighting math in the fragment shader simple.
  vNormal = normalize(normalMatrix * newNormal);
  vHeight = length(displaced) - 1.0;

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

export const fragmentShader = /* glsl */ `
uniform vec3 uColorA; // main album color
uniform vec3 uColorB; // second album color
uniform vec3 uColorC; // deep shade for the shadow side

varying vec3 vNormal;
varying float vHeight;

void main() {
  vec3 n = normalize(vNormal);
  // In view space the camera looks straight down -Z, so the direction
  // back toward the camera is simply +Z.
  vec3 view = vec3(0.0, 0.0, 1.0);

  // Gradient: bumps that stick out lean toward color B, dips toward A.
  float t = smoothstep(-0.25, 0.3, vHeight);
  vec3 base = mix(uColorA, uColorB, t);

  // Soft light from the top left. 0.35 + 0.65 * ... keeps the dark side
  // from going black (a cheap stand-in for ambient light).
  float light = max(dot(n, normalize(vec3(-0.5, 0.7, 0.6))), 0.0);
  vec3 color = mix(uColorC, base, 0.35 + 0.65 * light);

  // Fresnel rim: surfaces seen edge-on glow. 1 - dot(normal, view) is 0
  // facing the camera and 1 at the silhouette.
  float fresnel = pow(1.0 - max(dot(n, view), 0.0), 2.5);
  color += uColorB * fresnel * 0.6;

  gl_FragColor = vec4(color, 1.0);
  // three.js does lighting math in "linear" color and converts to the
  // screen's sRGB at the very end. Built-in materials do that for you; a
  // custom shader has to include the conversion itself, or every color
  // comes out too dark.
  #include <colorspace_fragment>
}
`;
