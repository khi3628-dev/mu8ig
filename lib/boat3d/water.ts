// 바다·하늘 셰이더. 파도는 월드 좌표 기준이라 JS의 waveHeight와 같은 식으로 배·부표를 띄운다.
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

const WAVE_GLSL = /* glsl */ `
float waveH(vec2 p, float t) {
  return sin(p.x * 0.12 + t * 1.1) * 0.5 + sin(p.y * 0.09 + t * 0.9) * 0.5 + sin((p.x + p.y) * 0.2 + t * 1.7) * 0.25;
}
vec2 waveG(vec2 p, float t) {
  float c = cos((p.x + p.y) * 0.2 + t * 1.7) * 0.05;
  return vec2(cos(p.x * 0.12 + t * 1.1) * 0.06 + c, cos(p.y * 0.09 + t * 0.9) * 0.045 + c);
}
`;

export const SUN_DIR = new THREE.Vector3(0.4, 0.55, -0.45).normalize();
export const HORIZON = 0xcfe9f7;

export function waveHeight(x: number, z: number, t: number, freq = 1, amp = 0.35) {
  const px = x * freq, pz = z * freq;
  const h =
    Math.sin(px * 0.12 + t * 1.1) * 0.5 +
    Math.sin(pz * 0.09 + t * 0.9) * 0.5 +
    Math.sin((px + pz) * 0.2 + t * 1.7) * 0.25;
  return h * amp;
}

export interface WaterOptions {
  amp: number;
  freq: number;
  ripple: number;
  rippleFreq: number; // 잔물결 주파수 (파라다이스는 작은 스케일이라 높게)
  foam: number; // 파도 마루 거품 세기
  spark: number; // 태양 반사 세기
  deep: number;
  shallow: number;
  fogNear: number;
  fogFar: number;
}

export function createWater(o: WaterOptions, size: number, segments: number) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uAmp: { value: o.amp },
      uFreq: { value: o.freq },
      uRipple: { value: o.ripple },
      uRipFreq: { value: o.rippleFreq },
      uFoam: { value: o.foam },
      uSpark: { value: o.spark },
      uDeep: { value: new THREE.Color(o.deep) },
      uShallow: { value: new THREE.Color(o.shallow) },
      uSky: { value: new THREE.Color(0x8fcdf5) },
      uHorizon: { value: new THREE.Color(HORIZON) },
      uSunDir: { value: SUN_DIR },
      uFogNear: { value: o.fogNear },
      uFogFar: { value: o.fogFar },
    },
    vertexShader: /* glsl */ `
      uniform float uTime, uAmp, uFreq;
      varying vec3 vWorld;
      varying float vH;
      ${WAVE_GLSL}
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        float h = waveH(w.xz * uFreq, uTime);
        w.y += h * uAmp;
        vWorld = w.xyz;
        vH = h;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime, uAmp, uFreq, uRipple, uRipFreq, uFoam, uSpark, uFogNear, uFogFar;
      uniform vec3 uDeep, uShallow, uSky, uHorizon, uSunDir;
      varying vec3 vWorld;
      varying float vH;
      ${WAVE_GLSL}
      void main() {
        vec2 p = vWorld.xz * uFreq;
        vec2 g = waveG(p, uTime) * uAmp * uFreq;
        vec2 q = vWorld.xz * uRipFreq;
        vec2 r = vec2(
          sin(q.x * 1.3 + uTime * 2.0) + sin(q.y * 1.7 - uTime * 1.6),
          sin(q.x * 1.9 - uTime * 1.8) + sin(q.y * 1.1 + uTime * 2.2)
        ) * 0.035 * uRipple;
        vec3 N = normalize(vec3(-g.x - r.x, 1.0, -g.y - r.y));
        vec3 V = normalize(cameraPosition - vWorld);
        float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
        vec3 col = mix(uDeep, uShallow, clamp(0.45 + vH * 0.45, 0.0, 1.0));
        col = mix(col, uSky, fres * 0.8);
        vec3 H = normalize(normalize(uSunDir) + V);
        col += vec3(1.0, 0.95, 0.82) * pow(max(dot(N, H), 0.0), 220.0) * 1.6 * uSpark;
        col = mix(col, vec3(1.0), smoothstep(0.62, 1.0, vH) * uFoam);
        float d = length(cameraPosition - vWorld);
        col = mix(col, uHorizon, smoothstep(uFogNear, uFogFar, d));
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size, segments, segments).rotateX(-Math.PI / 2), material);
  mesh.frustumCulled = false;
  return mesh;
}

// 금속·유광 재질이 반사할 환경맵 (없으면 금색이 검게 보인다)
export function createEnvironment(renderer: THREE.WebGLRenderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  return env;
}

export function createSky() {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uTop: { value: new THREE.Color(0x2f86d8) },
      uHorizon: { value: new THREE.Color(HORIZON) },
      uSunDir: { value: SUN_DIR },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uTop, uHorizon, uSunDir;
      varying vec3 vDir;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
      }
      float fbm(vec2 p) {
        float a = 0.5, s = 0.0;
        for (int i = 0; i < 4; i++) { s += a * noise(p); p *= 2.0; a *= 0.5; }
        return s;
      }
      void main() {
        vec3 dir = normalize(vDir);
        float up = clamp(dir.y, 0.0, 1.0);
        vec3 col = mix(uHorizon, uTop, pow(up, 0.55));
        float sun = max(dot(dir, normalize(uSunDir)), 0.0);
        col += vec3(1.0, 0.92, 0.75) * (pow(sun, 600.0) * 3.0 + pow(sun, 14.0) * 0.18);
        vec2 uv = dir.xz / (dir.y + 0.18) * 0.7 + uTime * 0.01;
        float c = smoothstep(0.5, 0.82, fbm(uv)) * smoothstep(0.02, 0.22, dir.y);
        col = mix(col, vec3(1.0), c * 0.85);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1800, 32, 16), material);
  mesh.frustumCulled = false;
  mesh.renderOrder = -1;
  return mesh;
}
