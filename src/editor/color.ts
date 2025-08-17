'use client';

// Color utilities: conversions, harmonies, and contrast (WCAG)

export type RGB = { r: number; g: number; b: number };
export type HSL = { h: number; s: number; l: number };

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function hexToRgb(hex: string): RGB {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return { r, g, b };
}

export function rgbToHex({ r, g, b }: RGB): string {
  const toHex = (v: number) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function rgbToHsl({ r, g, b }: RGB): HSL {
  const r1 = r / 255;
  const g1 = g / 255;
  const b1 = b / 255;
  const max = Math.max(r1, g1, b1);
  const min = Math.min(r1, g1, b1);
  const d = max - min;
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r1:
        h = 60 * (((g1 - b1) / d) % 6);
        break;
      case g1:
        h = 60 * ((b1 - r1) / d + 2);
        break;
      case b1:
        h = 60 * ((r1 - g1) / d + 4);
        break;
    }
  }

  if (h < 0) h += 360;
  return { h, s, l };
}

export function hslToRgb({ h, s, l }: HSL): RGB {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r1 = 0, g1 = 0, b1 = 0;

  if (0 <= h && h < 60) { r1 = c; g1 = x; b1 = 0; }
  else if (60 <= h && h < 120) { r1 = x; g1 = c; b1 = 0; }
  else if (120 <= h && h < 180) { r1 = 0; g1 = c; b1 = x; }
  else if (180 <= h && h < 240) { r1 = 0; g1 = x; b1 = c; }
  else if (240 <= h && h < 300) { r1 = x; g1 = 0; b1 = c; }
  else { r1 = c; g1 = 0; b1 = x; }

  const r = (r1 + m) * 255;
  const g = (g1 + m) * 255;
  const b = (b1 + m) * 255;
  return { r, g, b };
}

export function rotateHue(hex: string, delta: number): string {
  const hsl = rgbToHsl(hexToRgb(hex));
  const h = (hsl.h + delta + 360) % 360;
  return rgbToHex(hslToRgb({ h, s: hsl.s, l: hsl.l }));
}

export function makeHarmonies(baseHex: string): { complementary: string; triad: [string, string] } {
  const complementary = rotateHue(baseHex, 180);
  const triad1 = rotateHue(baseHex, 120);
  const triad2 = rotateHue(baseHex, -120);
  return { complementary, triad: [triad1, triad2] };
}

// WCAG relative luminance and contrast ratio
export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const rs = r / 255; const gs = g / 255; const bs = b / 255;
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const R = lin(rs), G = lin(gs), B = lin(bs);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

export function contrastRatio(aHex: string, bHex: string): number {
  const L1 = relativeLuminance(aHex);
  const L2 = relativeLuminance(bHex);
  const [hi, lo] = L1 >= L2 ? [L1, L2] : [L2, L1];
  return (hi + 0.05) / (lo + 0.05);
}

export type ContrastBadges = {
  ratio: number;
  normal: 'AAA' | 'AA' | null;
  large: 'AAA' | 'AA' | null;
};

export function getContrastBadges(bgHex: string, textHex: string): ContrastBadges {
  const ratio = contrastRatio(bgHex, textHex);
  const normal = ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : null;
  const large = ratio >= 4.5 ? 'AAA' : ratio >= 3 ? 'AA' : null;
  return { ratio: Math.round(ratio * 10) / 10, normal, large };
}
