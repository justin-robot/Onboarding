import React, { useRef, useEffect } from "react";

// --- Minimal 3D simplex noise (Stefan Gustavson, JS port) ---
function makeSimplex3D() {
  const F3 = 1 / 3;
  const G3 = 1 / 6;

  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [p[i], p[j]] = [p[j], p[i]];
  }
  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];

  const grad3 = [
    [1, 1, 0],
    [-1, 1, 0],
    [1, -1, 0],
    [-1, -1, 0],
    [1, 0, 1],
    [-1, 0, 1],
    [1, 0, -1],
    [-1, 0, -1],
    [0, 1, 1],
    [0, -1, 1],
    [0, 1, -1],
    [0, -1, -1],
  ];

  function dot(g: number[], x: number, y: number, z: number) {
    return g[0] * x + g[1] * y + g[2] * z;
  }

  function noise3D(xin: number, yin: number, zin: number) {
    let n0, n1, n2, n3;

    const s = (xin + yin + zin) * F3;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const k = Math.floor(zin + s);
    const t = (i + j + k) * G3;
    const X0 = i - t;
    const Y0 = j - t;
    const Z0 = k - t;
    const x0 = xin - X0;
    const y0 = yin - Y0;
    const z0 = zin - Z0;

    let i1, j1, k1;
    let i2, j2, k2;

    if (x0 >= y0) {
      if (y0 >= z0) {
        i1 = 1;
        j1 = 0;
        k1 = 0;
        i2 = 1;
        j2 = 1;
        k2 = 0;
      } else if (x0 >= z0) {
        i1 = 1;
        j1 = 0;
        k1 = 0;
        i2 = 1;
        j2 = 0;
        k2 = 1;
      } else {
        i1 = 0;
        j1 = 0;
        k1 = 1;
        i2 = 1;
        j2 = 0;
        k2 = 1;
      }
    } else {
      if (y0 < z0) {
        i1 = 0;
        j1 = 0;
        k1 = 1;
        i2 = 0;
        j2 = 1;
        k2 = 1;
      } else if (x0 < z0) {
        i1 = 0;
        j1 = 1;
        k1 = 0;
        i2 = 0;
        j2 = 1;
        k2 = 1;
      } else {
        i1 = 0;
        j1 = 1;
        k1 = 0;
        i2 = 1;
        j2 = 1;
        k2 = 0;
      }
    }

    const x1 = x0 - i1 + G3;
    const y1 = y0 - j1 + G3;
    const z1 = z0 - k1 + G3;
    const x2 = x0 - i2 + 2 * G3;
    const y2 = y0 - j2 + 2 * G3;
    const z2 = z0 - k2 + 2 * G3;
    const x3 = x0 - 1 + 3 * G3;
    const y3 = y0 - 1 + 3 * G3;
    const z3 = z0 - 1 + 3 * G3;

    const ii = i & 255;
    const jj = j & 255;
    const kk = k & 255;

    let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
    if (t0 < 0) n0 = 0;
    else {
      t0 *= t0;
      const gi0 = perm[ii + perm[jj + perm[kk]]] % 12;
      n0 = t0 * t0 * dot(grad3[gi0], x0, y0, z0);
    }

    let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
    if (t1 < 0) n1 = 0;
    else {
      t1 *= t1;
      const gi1 = perm[ii + i1 + perm[jj + j1 + perm[kk + k1]]] % 12;
      n1 = t1 * t1 * dot(grad3[gi1], x1, y1, z1);
    }

    let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
    if (t2 < 0) n2 = 0;
    else {
      t2 *= t2;
      const gi2 = perm[ii + i2 + perm[jj + j2 + perm[kk + k2]]] % 12;
      n2 = t2 * t2 * dot(grad3[gi2], x2, y2, z2);
    }

    let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
    if (t3 < 0) n3 = 0;
    else {
      t3 *= t3;
      const gi3 = perm[ii + 1 + perm[jj + 1 + perm[kk + 1]]] % 12;
      n3 = t3 * t3 * dot(grad3[gi3], x3, y3, z3);
    }

    // scale to roughly [-1,1]
    return 32 * (n0 + n1 + n2 + n3);
  }

  return noise3D;
}

// --- React component using that noise ---
export const FlowingPixelsCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const noise3D = makeSimplex3D();

    let frameId: number;
    let t = 0;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      ctx.imageSmoothingEnabled = false;
    };

    resizeCanvas();
    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(canvas);

    const field = (x: number, y: number, time: number) => {
      const nx = x * 0.035;
      const ny = y * 0.035;

      // base drift - slower
      const dx = nx + time * 0.005;
      const dy = ny - time * 0.003;

      // domain warp - slower
      const w1 = noise3D(nx * 0.6, ny * 0.6, time * 0.0025);
      const w2 = noise3D(nx * 0.6 + 50, ny * 0.6 + 50, time * 0.0025);

      const vx = dx + w1 * 0.8;
      const vy = dy + w2 * 0.8;

      const n = noise3D(vx, vy, time * 0.005); // -1..1, slower
      return (n + 1) / 2; // 0..1
    };

    const render = () => {
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      ctx.clearRect(0, 0, width, height);

      // Dynamic grid based on canvas size
      const cellSize = Math.max(4, Math.floor(width / 120)); // Adjust density for screen size
      const cols = Math.ceil(width / cellSize);
      const rows = Math.ceil(height / cellSize);
      const cellW = width / cols;
      const cellH = height / rows;

      for (let gy = 0; gy < rows; gy++) {
        for (let gx = 0; gx < cols; gx++) {
          const v = field(gx, gy, t);

          if (v > 0.42) {
            const intensity = (v - 0.42) / 0.58;
            const heat = Math.pow(intensity, 1.6);

            // Pure grayscale - ensure all RGB values are exactly the same
            const grayValue = Math.floor(180 + 75 * heat);
            const alpha = 0.1 + 0.9 * heat;

            ctx.fillStyle = `rgba(${grayValue},${grayValue},${grayValue},${alpha})`;
            ctx.fillRect(
              gx * cellW,
              gy * cellH,
              cellW * 0.95,
              cellH * 0.95
            );
          }
        }
      }

      t += 1;
      frameId = window.requestAnimationFrame(render);
    };

    render();

    return () => {
      resizeObserver.disconnect();
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
};
