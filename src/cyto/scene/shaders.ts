import * as THREE from "three";
import { PAL } from "../palette";

export function makeMembraneMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uRim: { value: new THREE.Color(PAL.pink) },
      uFill: { value: new THREE.Color(PAL.pinkSoft) },
      uFar: { value: 1 },
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      varying vec3 vN; varying vec3 vV; varying vec3 vP;
      void main() {
        vec3 p = position;
        float w = sin(p.x * 0.55 + uTime * 0.6) * sin(p.y * 0.5 + uTime * 0.45) * sin(p.z * 0.45 + uTime * 0.5);
        p += normal * w * 0.28;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        vP = p;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uRim; uniform vec3 uFill; uniform float uFar; uniform float uTime;
      varying vec3 vN; varying vec3 vV; varying vec3 vP;
      void main() {
        float d = clamp(abs(dot(normalize(vN), normalize(vV))), 0.0, 1.0);
        float f = 1.0 - d; f = f * f;
        float speck = sin(vP.x * 9.0 + uTime * 0.3) * sin(vP.y * 9.0) * sin(vP.z * 9.0);
        vec3 c = mix(uFill, uRim, f) + 0.035 * speck;
        float a = mix(0.07, 0.8, f);
        a = mix(a, 0.96, uFar);
        c = mix(c, uRim, uFar * 0.55);
        gl_FragColor = vec4(c, a);
      }`,
  });
}

export function makeGlowMaterial(color: string, intensity = 0.6, power = 2.0) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uIntensity: { value: intensity },
      uPower: { value: power },
    },
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vV;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uIntensity; uniform float uPower;
      varying vec3 vN; varying vec3 vV;
      void main() {
        float d = clamp(abs(dot(normalize(vN), normalize(vV))), 0.0, 1.0);
        float g = pow(max(d, 0.0001), uPower);
        gl_FragColor = vec4(uColor * g * uIntensity, 1.0);
      }`,
  });
}

/** Soft, round, drifting points: cytoplasm streaming + Brownian jiggle on the GPU. */
export function makeParticleMaterial(radius: number) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uSize: { value: 26 },
      uRadius: { value: radius },
      uPixelRatio: { value: 1 },
    },
    vertexShader: /* glsl */ `
      uniform float uTime; uniform float uSize; uniform float uRadius; uniform float uPixelRatio;
      attribute vec4 aSeed; attribute vec3 aColor;
      varying vec3 vColor; varying float vAlpha;
      void main() {
        vec3 p = position;
        float ang = uTime * (0.04 + aSeed.x * 0.07);
        float c = cos(ang), s = sin(ang);
        p.xz = mat2(c, -s, s, c) * p.xz;
        float j = 0.22 + aSeed.w * 0.25;
        p += j * vec3(
          sin(uTime * (0.9 + aSeed.y * 1.6) + aSeed.z * 40.0),
          sin(uTime * (0.8 + aSeed.z * 1.4) + aSeed.w * 40.0),
          sin(uTime * (1.1 + aSeed.w * 1.2) + aSeed.y * 40.0));
        float r = length(p);
        if (r > uRadius) p *= uRadius / r;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float sz = uSize * (0.35 + aSeed.x * 0.9) * uPixelRatio / max(-mv.z, 0.1);
        gl_PointSize = min(sz, 42.0 * uPixelRatio);
        gl_Position = projectionMatrix * mv;
        vColor = aColor;
        vAlpha = smoothstep(0.2, 1.2, -mv.z);
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vColor; varying float vAlpha;
      void main() {
        vec2 q = gl_PointCoord - 0.5;
        float d = length(q);
        float a = smoothstep(0.5, 0.18, d) * 0.9 * vAlpha;
        if (a < 0.01) discard;
        vec3 c = vColor + (0.25 - d) * 0.35;
        gl_FragColor = vec4(c, a);
      }`,
  });
}

export function makeBackdropMaterial() {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTop: { value: new THREE.Color(PAL.lavenderSoft) },
      uMid: { value: new THREE.Color(PAL.blush) },
      uBottom: { value: new THREE.Color(PAL.blushDeep) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uBottom;
      varying vec3 vDir;
      void main() {
        float y = vDir.y;
        vec3 c = mix(uMid, uTop, smoothstep(0.0, 0.7, y));
        c = mix(c, uBottom, smoothstep(0.0, -0.8, y));
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
}
