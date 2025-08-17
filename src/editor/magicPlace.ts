'use client';

import { contrastRatio, rgbToHex, hexToRgb } from '@/editor/color';

export type Heatmap = {
  w: number;
  h: number;
  scale: number; // downscale factor relative to original bg size
  saliency: Float32Array; // length = w*h, [0..1]
  integralS: Float32Array; // (w+1)*(h+1)
  integralR: Float32Array; // (w+1)*(h+1)
  integralG: Float32Array; // (w+1)*(h+1)
  integralB: Float32Array; // (w+1)*(h+1)
};

const cache = new Map<string, Heatmap>();

function createCanvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 2D not supported');
  return { c, ctx };
}

function buildIntegral(data: Float32Array | Uint8ClampedArray, w: number, h: number, stride = 1, offset = 0): Float32Array {
  // Build summed-area table with size (w+1)*(h+1)
  const W = w + 1;
  const out = new Float32Array(W * (h + 1));
  // out[y*W + x]
  for (let y = 1; y <= h; y++) {
    let rowsum = 0;
    for (let x = 1; x <= w; x++) {
      let v: number;
      if (data instanceof Uint8ClampedArray) {
        v = data[((y - 1) * w + (x - 1)) * stride + offset];
      } else {
        v = data[(y - 1) * w + (x - 1)];
      }
      rowsum += v;
      out[y * W + x] = out[(y - 1) * W + x] + rowsum;
    }
  }
  return out;
}

function rectSum(integral: Float32Array, x: number, y: number, w: number, h: number, widthPlus1: number) {
  const x2 = x + w; const y2 = y + h;
  const A = integral[y * widthPlus1 + x];
  const B = integral[y * widthPlus1 + x2];
  const C = integral[y2 * widthPlus1 + x];
  const D = integral[y2 * widthPlus1 + x2];
  return D - B - C + A;
}

export async function getHeatmap(bgSrc: string, origW: number, origH: number): Promise<Heatmap> {
  const key = `${bgSrc}@${origW}x${origH}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = reject;
    im.src = bgSrc;
  });

  const maxW = Math.min(384, origW);
  const scale = maxW / origW;
  const w = Math.max(1, Math.round(origW * scale));
  const h = Math.max(1, Math.round(origH * scale));

  const { ctx } = createCanvas(w, h);
  ctx.drawImage(img, 0, 0, w, h);
  const image = ctx.getImageData(0, 0, w, h);
  const rgba = image.data; // Uint8ClampedArray length 4*w*h

  // Build RGB integrals
  const integralR = new Float32Array((w + 1) * (h + 1));
  const integralG = new Float32Array((w + 1) * (h + 1));
  const integralB = new Float32Array((w + 1) * (h + 1));
  {
    const W = w + 1;
    for (let y = 1; y <= h; y++) {
      let rowR = 0, rowG = 0, rowB = 0;
      for (let x = 1; x <= w; x++) {
        const idx = ((y - 1) * w + (x - 1)) * 4;
        const r = rgba[idx], g = rgba[idx + 1], b = rgba[idx + 2];
        rowR += r; rowG += g; rowB += b;
        const base = y * W + x;
        integralR[base] = integralR[base - W] + rowR;
        integralG[base] = integralG[base - W] + rowG;
        integralB[base] = integralB[base - W] + rowB;
      }
    }
  }

  // Grayscale and Sobel gradient magnitude as saliency
  const gray = new Float32Array(w * h);
  for (let i = 0, p = 0; i < gray.length; i++, p += 4) {
    const r = rgba[p]; const g = rgba[p + 1]; const b = rgba[p + 2];
    gray[i] = 0.2126 * r + 0.7152 * g + 0.0722 * b; // perceptual luma
  }

  const sal = new Float32Array(w * h);
  let maxMag = 1e-6;
  // Sobel kernels
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const tl = gray[(y - 1) * w + (x - 1)], tc = gray[(y - 1) * w + x], tr = gray[(y - 1) * w + (x + 1)];
      const ml = gray[y * w + (x - 1)], mr = gray[y * w + (x + 1)];
      const bl = gray[(y + 1) * w + (x - 1)], bc = gray[(y + 1) * w + x], br = gray[(y + 1) * w + (x + 1)];
      const gx = -tl + tr - 2 * ml + 2 * mr - bl + br;
      const gy = -tl - 2 * tc - tr + bl + 2 * bc + br;
      const mag = Math.hypot(gx, gy);
      sal[i] = mag;
      if (mag > maxMag) maxMag = mag;
    }
  }
  // Normalize to [0,1]
  for (let i = 0; i < sal.length; i++) sal[i] = sal[i] / maxMag;

  const integralS = buildIntegral(sal, w, h);

  const heat: Heatmap = { w, h, scale, saliency: sal, integralS, integralR, integralG, integralB };
  cache.set(key, heat);
  return heat;
}

function avgFromIntegral(integral: Float32Array, x: number, y: number, w: number, h: number, widthPlus1: number) {
  const sum = rectSum(integral, x, y, w, h, widthPlus1);
  return sum / (w * h);
}

export function suggestPlacement(opts: {
  heatmap: Heatmap;
  textW: number; // original canvas px
  textH: number; // original canvas px
  textColor: string; // hex
  alpha?: number;
  beta?: number;
  margin?: number;
  avoidRects?: Array<{ x: number; y: number; width: number; height: number }>; // original canvas px
  avoidPadding?: number; // original canvas px, extra padding around avoid rects
}): { x: number; y: number; score: number } {
  const { heatmap, textW, textH, textColor } = opts;
  const alpha = opts.alpha ?? 0.6;
  const beta = opts.beta ?? 0.4;
  const margin = Math.max(0, Math.floor((opts.margin ?? 8) * heatmap.scale));
  const avoidPadPx = Math.max(0, opts.avoidPadding ?? 4);

  const W1 = heatmap.w + 1;

  // Map text box size into heatmap scale
  const tw = Math.max(6, Math.round(textW * heatmap.scale));
  const th = Math.max(6, Math.round(textH * heatmap.scale));

  if (tw >= heatmap.w || th >= heatmap.h) {
    // If text is bigger than downscaled bg, just return top-left with margin
    return { x: margin / heatmap.scale, y: margin / heatmap.scale, score: 0 };
  }

  const step = Math.max(4, Math.floor(Math.min(tw, th) / 3));

  let best = { x: margin, y: margin, score: -Infinity };

  // Pre-parse text color to ensure valid hex
  const textHex = textColor.startsWith('#') ? textColor : rgbToHex(hexToRgb(textColor));

  // Prepare avoid rects in heatmap scale
  const scaledAvoid: Array<{ x: number; y: number; w: number; h: number }> = (opts.avoidRects || []).map(r => {
    const s = heatmap.scale;
    const pad = Math.round(avoidPadPx * s);
    return {
      x: Math.max(0, Math.round(r.x * s) - pad),
      y: Math.max(0, Math.round(r.y * s) - pad),
      w: Math.min(heatmap.w, Math.round(r.width * s) + 2 * pad),
      h: Math.min(heatmap.h, Math.round(r.height * s) + 2 * pad),
    };
  });

  const overlaps = (ax: number, ay: number, aw: number, ah: number, b: {x:number;y:number;w:number;h:number}) =>
    ax < b.x + b.w && ax + aw > b.x && ay < b.y + b.h && ay + ah > b.y;

  for (let y = margin; y <= heatmap.h - margin - th; y += step) {
    for (let x = margin; x <= heatmap.w - margin - tw; x += step) {
      // Skip if overlapping avoid rects
      if (scaledAvoid.some(b => overlaps(x, y, tw, th, b))) {
        continue;
      }
      // Average saliency in region
      const avgSal = avgFromIntegral(heatmap.integralS, x, y, tw, th, W1); // 0..1

      // Average background RGB in region via integrals
      const r = avgFromIntegral(heatmap.integralR, x, y, tw, th, W1);
      const g = avgFromIntegral(heatmap.integralG, x, y, tw, th, W1);
      const b = avgFromIntegral(heatmap.integralB, x, y, tw, th, W1);
      const bgHex = rgbToHex({ r, g, b });

      const cr = contrastRatio(bgHex, textHex); // 1..21
      const crNorm = Math.min(21, cr) / 21;

      const score = alpha * (1 - avgSal) + beta * crNorm;
      if (score > best.score) best = { x, y, score };
    }
  }

  // Map back to original canvas space
  const outX = Math.round(best.x / heatmap.scale);
  const outY = Math.round(best.y / heatmap.scale);
  return { x: outX, y: outY, score: best.score };
}
