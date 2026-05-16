import { useEffect, useRef } from 'react';

export type OrbState = 'idle' | 'thinking' | 'tool' | 'search' | 'speaking' | 'error' | 'muted';

interface OrbCanvasProps {
  state?: OrbState;
  size?: number;
}

const VERT_SRC = `
  attribute vec2 aPos;
  void main() {
    gl_Position = vec4(aPos, 0.0, 1.0);
  }
`;

const FRAG_SRC = `
  precision mediump float;
  uniform float uTime;
  uniform int uState;
  uniform float uMute;

  const float PI = 3.14159265;

  vec3 desaturate(vec3 c, float t) {
    float lum = dot(c, vec3(0.299, 0.587, 0.114));
    return mix(c, vec3(lum), t);
  }

  void main() {
    vec2 uv = vUv * 2.0 - 1.0;
    float d = dot(uv, uv);
    if (d > 1.0) discard;
    float z = sqrt(1.0 - d);
    vec3 n = vec3(uv, z);

    float phi = atan(n.y, n.x) / (2.0 * PI) + 0.5;
    float theta = acos(n.z) / PI;
    float u = phi;
    float v = theta;

    float t = uTime;
    vec3 color;
    float glow = 0.0;

    if (uState == 0) {
      // idle: cyan pulse
      color = vec3(0.0, 1.0, 1.0);
      float pulse = 0.7 + 0.3 * sin(t * 2.0);
      glow = pulse;
    } else if (uState == 1) {
      // thinking: blue ripple
      color = vec3(0.2, 0.4, 1.0);
      float ripple = sin(phi * 12.0 - t * 5.0) * 0.5 + 0.5;
      float theta2 = theta * PI;
      ripple *= sin(theta2 * 4.0 - t * 3.0) * 0.5 + 0.5;
      glow = 0.6 + ripple * 0.4;
    } else if (uState == 2) {
      // tool: green jitter
      color = vec3(0.1, 0.9, 0.3);
      float jit = sin(phi * 30.0 + t * 20.0) * sin(theta * 20.0 + t * 15.0);
      glow = 0.7 + abs(jit) * 0.3;
    } else if (uState == 3) {
      // search: yellow fast pulse
      color = vec3(1.0, 0.85, 0.0);
      float fp = sin(t * 8.0 + phi * 8.0) * sin(t * 6.0 + theta * 8.0);
      glow = 0.6 + abs(fp) * 0.4;
    } else if (uState == 4) {
      // speaking: magenta bounce
      color = vec3(1.0, 0.1, 0.8);
      float bounce = sin(t * 6.0) * 0.5 + 0.5;
      float stripe = sin(theta * PI * 6.0 + t * 4.0) * 0.5 + 0.5;
      glow = 0.5 + bounce * 0.3 + stripe * 0.2;
    } else if (uState == 5) {
      // error: orange
      color = vec3(1.0, 0.45, 0.0);
      float err = sin(phi * 8.0 + t * 4.0) * sin(theta * 8.0 - t * 3.0);
      glow = 0.7 + abs(err) * 0.3;
    } else {
      // muted
      color = vec3(0.5, 0.5, 0.55);
      glow = 0.4;
    }

    if (uMute > 0.5) {
      color = desaturate(color, 0.7);
      glow = glow * 0.6;
    }

    float rim = 1.0 - smoothstep(0.6, 1.0, length(uv));
    float brightness = glow * rim;

    gl_FragColor = vec4(color * brightness, brightness);
  }
`;

function createShader(gl: WebGLRenderingContext, type: number, src: string): WebGLShader {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  return shader;
}

function createProgram(gl: WebGLRenderingContext, vert: WebGLShader, frag: WebGLShader): WebGLProgram {
  const prog = gl.createProgram()!;
  gl.attachShader(prog, vert);
  gl.attachShader(prog, frag);
  gl.linkProgram(prog);
  return prog;
}

function buildSphere(): Float32Array {
  const latBands = 16;
  const lonBands = 24;
  const verts: number[] = [];
  for (let lat = 0; lat <= latBands; lat++) {
    const theta = (lat * Math.PI) / latBands;
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);
    for (let lon = 0; lon <= lonBands; lon++) {
      const phi = (lon * 2 * Math.PI) / lonBands;
      const x = Math.cos(phi) * sinTheta;
      const y = cosTheta;
      const z = Math.sin(phi) * sinTheta;
      verts.push(x, y, z);
    }
  }
  const idx: number[] = [];
  for (let lat = 0; lat < latBands; lat++) {
    for (let lon = 0; lon < lonBands; lon++) {
      const a = lat * (lonBands + 1) + lon;
      const b = a + lonBands + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const full = new Float32Array(verts.length / 3 * 2);
  for (let i = 0; i < verts.length / 3; i++) {
    full[i * 2] = verts[i * 3];
    full[i * 2 + 1] = verts[i * 3 + 1];
  }
  return full;
}

const STATE_MAP: Record<OrbState, number> = {
  idle: 0,
  thinking: 1,
  tool: 2,
  search: 3,
  speaking: 4,
  error: 5,
  muted: 6,
};

export function OrbCanvas({ state = 'idle', size = 36 }: OrbCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(state);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const progRef = useRef<WebGLProgram | null>(null);
  const timeRef = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = size;
    canvas.height = size;

    const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false });
    if (!gl) return;
    glRef.current = gl;

    const vert = createShader(gl, gl.VERTEX_SHADER, VERT_SRC);
    const frag = createShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
    const prog = createProgram(gl, vert, frag);
    progRef.current = prog;
    gl.useProgram(prog);

    const sphere = buildSphere();
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, sphere, gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const timeLoc = gl.getUniformLocation(prog, 'uTime');
    const stateLoc = gl.getUniformLocation(prog, 'uState');
    const muteLoc = gl.getUniformLocation(prog, 'uMute');

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const start = performance.now();
    function frame() {
      const gl = glRef.current;
      const prog = progRef.current;
      if (!gl || !prog) return;
      timeRef.current = (performance.now() - start) / 1000;
      gl.viewport(0, 0, size, size);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(timeLoc, timeRef.current);
      gl.uniform1i(stateLoc, STATE_MAP[stateRef.current]);
      gl.uniform1f(muteLoc, state === 'muted' ? 1.0 : 0.0);
      gl.drawArrays(gl.TRIANGLES, 0, sphere.length / 2);
      rafRef.current = requestAnimationFrame(frame);
    }
    rafRef.current = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafRef.current);
      gl.deleteProgram(prog);
      gl.deleteShader(vert);
      gl.deleteShader(frag);
    };
  }, [size]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: size,
        height: size,
        display: 'block',
        borderRadius: '50%',
      }}
    />
  );
}
