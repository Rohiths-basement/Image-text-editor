'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useEditor, useSelectedLayers } from '@/editor/store';
import { GoogleFont, TextLayer, TextStylePreset } from '@/editor/types';
import { NumericInput } from './NumericInput';
import { FontDropdown } from './FontDropdown';
import { ColorPicker } from './ColorPicker';
import { makeHarmonies, getContrastBadges } from '@/editor/color';

const FONT_WEIGHTS = [
  { value: 100, label: 'Thin' },
  { value: 200, label: 'Extra Light' },
  { value: 300, label: 'Light' },
  { value: 400, label: 'Regular' },
  { value: 500, label: 'Medium' },
  { value: 600, label: 'Semi Bold' },
  { value: 700, label: 'Bold' },
  { value: 800, label: 'Extra Bold' },
  { value: 900, label: 'Black' },
];

const ALIGNMENTS = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
] as const;

export const InspectorPanel: React.FC = () => {
  const { updateLayer, commit, bg, presets, addPreset, deletePreset } = useEditor();
  const selectedLayers = useSelectedLayers();
  const [fonts, setFonts] = useState<GoogleFont[]>([]);
  const [loadedFonts, setLoadedFonts] = useState<Set<string>>(new Set(['Inter']));
  const [colorSwatches, setColorSwatches] = useState<string[]>([]);
  const [paletteSwatches, setPaletteSwatches] = useState<string[]>([]); // From ColorThief
  const [harmonySwatches, setHarmonySwatches] = useState<string[]>([]);
  const [presetName, setPresetName] = useState<string>('');
  const textTimerRef = useRef<number | null>(null);

  // Live update for color without committing history on every drag tick
  const rafIdRef = useRef<number | null>(null);
  const latestColorRef = useRef<string | null>(null);
  const setFillLive = (color: string) => {
    latestColorRef.current = color;
    if (rafIdRef.current != null) return;
    rafIdRef.current = window.requestAnimationFrame(() => {
      rafIdRef.current = null;
      const c = latestColorRef.current;
      if (!c) return;
      selectedLayers.forEach((l) => {
        updateLayer(l.id, { fill: c } as Partial<TextLayer>);
      });
      // Do not commit here; commit happens on ColorPicker onCommit
    });
  };

  // Cleanup any pending RAF on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current != null) cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
      latestColorRef.current = null;
    };
  }, []);

  // Load Google Fonts
  useEffect(() => {
    const loadFonts = async () => {
      try {
        const response = await fetch('/api/fonts');
        const data = await response.json();
        setFonts(data.items || []);
      } catch (error) {
        console.error('Failed to load fonts:', error);
        // Fallback to basic fonts
        setFonts([
          { family: 'Inter', variants: ['400', '500', '600', '700'], subsets: ['latin'], category: 'sans-serif' },
          { family: 'Arial', variants: ['400', '700'], subsets: ['latin'], category: 'sans-serif' },
          { family: 'Helvetica', variants: ['400', '700'], subsets: ['latin'], category: 'sans-serif' },
          { family: 'Times New Roman', variants: ['400', '700'], subsets: ['latin'], category: 'serif' },
          { family: 'Georgia', variants: ['400', '700'], subsets: ['latin'], category: 'serif' },
        ]);
      }
    };
    loadFonts();
  }, []);

  // Generate color swatches from background image
  useEffect(() => {
    if (!bg?.src) {
      setColorSwatches([]);
      setPaletteSwatches([]);
      setHarmonySwatches([]);
      return;
    }

    const generateSwatches = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        canvas.width = 100;
        canvas.height = 100;
        ctx?.drawImage(img, 0, 0, 100, 100);
        
        const imageData = ctx?.getImageData(0, 0, 100, 100);
        if (!imageData) return;

        const colors = new Map<string, number>();
        
        // Sample pixels and count colors
        for (let i = 0; i < imageData.data.length; i += 16) { // Sample every 4th pixel
          const r = imageData.data[i];
          const g = imageData.data[i + 1];
          const b = imageData.data[i + 2];
          const a = imageData.data[i + 3];
          
          if (a < 128) continue; // Skip transparent pixels
          
          // Quantize colors to reduce noise
          const qr = Math.round(r / 32) * 32;
          const qg = Math.round(g / 32) * 32;
          const qb = Math.round(b / 32) * 32;
          
          const hex = `#${qr.toString(16).padStart(2, '0')}${qg.toString(16).padStart(2, '0')}${qb.toString(16).padStart(2, '0')}`;
          colors.set(hex, (colors.get(hex) || 0) + 1);
        }
        
        // Get top 8 most common colors
        const sortedColors = Array.from(colors.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([color]) => color);
          
        setColorSwatches(sortedColors);
      };
      
      img.src = bg.src;
    };

    generateSwatches();
  }, [bg?.src]);

  // Extract dominant palette via ColorThief (with fallback) and compute harmonies
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!bg?.src) return;
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.decoding = 'async';
        const onLoad = async () => {
          try {
            const { default: ColorThief } = await import('colorthief');
            const colorThief = new ColorThief();
            const palette: number[][] = colorThief.getPalette(img, 6);
            if (cancelled) return;
            const toHex = (rgb: number[]) => `#${rgb[0].toString(16).padStart(2,'0')}${rgb[1].toString(16).padStart(2,'0')}${rgb[2].toString(16).padStart(2,'0')}`.toUpperCase();
            const hexes = (palette || []).map(toHex);
            setPaletteSwatches(hexes);
            const base = hexes[0];
            if (base) {
              const { complementary, triad } = makeHarmonies(base);
              setHarmonySwatches([complementary, ...triad]);
            } else {
              setHarmonySwatches([]);
            }
          } catch {
            // Fallback: derive palette from existing quantized swatches if available
            if (cancelled) return;
            const fallback = colorSwatches.slice(0, 6);
            setPaletteSwatches(fallback);
            const base = fallback[0];
            if (base) {
              const { complementary, triad } = makeHarmonies(base);
              setHarmonySwatches([complementary, ...triad]);
            } else {
              setHarmonySwatches([]);
            }
          }
        };
        img.onload = onLoad;
        img.src = bg.src;
      } catch {
        // ignore
      }
    };
    run();
    return () => { cancelled = true; };
  }, [bg?.src, colorSwatches]);

  const loadFont = (fontFamily: string) => {
    if (loadedFonts.has(fontFamily)) return;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/\s+/g, '+')}:wght@100;200;300;400;500;600;700;800;900&display=swap`;
    document.head.appendChild(link);
    
    setLoadedFonts(prev => new Set([...prev, fontFamily]));
  };

  if (selectedLayers.length === 0) {
    return (
      <div className="w-80 bg-gray-50 border-l border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Inspector</h2>
        <p className="text-gray-500 text-center">
          Select a text layer to edit its properties
        </p>
      </div>
    );
  }

  const layer = selectedLayers[0]; // For now, edit first selected layer
  const isMultiSelect = selectedLayers.length > 1;

  const handleUpdate = <K extends keyof TextLayer>(property: K, value: TextLayer[K]) => {
    selectedLayers.forEach(l => {
      updateLayer(l.id, { [property]: value } as Partial<TextLayer>);
    });
    commit();
  };

  const handleFontChange = (fontFamily: string) => {
    loadFont(fontFamily);
    handleUpdate('fontFamily', fontFamily);
  };

  const handleShadowChange = (patch: Partial<NonNullable<TextLayer['shadow']>>) => {
    selectedLayers.forEach(l => {
      const next = { ...(l.shadow || { color: '#00000080', blur: 8, offsetX: 2, offsetY: 2 }), ...patch };
      updateLayer(l.id, { shadow: next });
    });
    commit();
  };

  const handleWarpChange = (patch: Partial<NonNullable<TextLayer['warp']>>) => {
    selectedLayers.forEach(l => {
      const base = l.warp || { type: 'none', radius: 150, direction: 'up' as const, spacing: 0 };
      const next = { ...base, ...patch };
      updateLayer(l.id, { warp: next });
    });
    commit();
  };

  const onFontFileSelected = async (file?: File | null) => {
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['ttf', 'otf', 'woff', 'woff2'].includes(ext)) return;
    try {
      const buf = await file.arrayBuffer();
      const family = file.name.replace(/\.[^/.]+$/, '');
      const fontFace = new FontFace(family, buf);
      await fontFace.load();
      // @ts-ignore - TS may not know about document.fonts
      document.fonts.add(fontFace);
      setLoadedFonts(prev => new Set([...prev, family]));
      setFonts(prev => {
        if (prev.some(f => f.family === family)) return prev;
        return [
          { family, variants: ['400', '700'], subsets: ['latin'], category: 'custom' as any },
          ...prev,
        ];
      });
      handleFontChange(family);
    } catch (e) {
      console.error('Failed to load custom font', e);
    }
  };

  return (
    <div className="w-80 bg-gray-50 border-l border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200 bg-white sticky top-0 z-10">
        <h2 className="text-lg font-semibold text-gray-900">Inspector</h2>
        {isMultiSelect && (
          <p className="text-sm text-gray-500 mt-1">
            {selectedLayers.length} layers selected
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Text Style Presets */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">Text Style Presets</label>
          </div>
          <div className="flex items-center space-x-2 mb-2">
            <input
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="Preset name"
              className="flex-1 px-2 py-1 border border-gray-300 rounded bg-white text-gray-900 placeholder:text-gray-500 shadow-sm"
            />
            <button
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded disabled:opacity-50"
              disabled={!presetName.trim()}
              title="Save current text settings as a preset"
              onClick={() => {
                if (!presetName.trim()) return;
                const p: TextStylePreset = {
                  id: crypto.randomUUID(),
                  name: presetName.trim(),
                  fontFamily: layer.fontFamily,
                  fontSize: layer.fontSize,
                  fontWeight: layer.fontWeight,
                  fill: layer.fill,
                  lineHeight: layer.lineHeight,
                  letterSpacing: layer.letterSpacing,
                  shadow: layer.shadow,
                  warp: layer.warp,
                };
                addPreset(p);
                setPresetName('');
              }}
            >
              Save
            </button>
          </div>
          {presets.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {presets.map((p) => (
                <div key={p.id} className="flex items-center space-x-2 border border-gray-200 rounded px-2 py-1">
                  <button
                    className="text-sm text-blue-700 hover:underline"
                    title={`Apply preset: ${p.name}`}
                    onClick={() => {
                      loadFont(p.fontFamily);
                      selectedLayers.forEach(l => {
                        updateLayer(l.id, {
                          fontFamily: p.fontFamily,
                          fontSize: p.fontSize,
                          fontWeight: p.fontWeight,
                          fill: p.fill,
                          lineHeight: p.lineHeight,
                          letterSpacing: p.letterSpacing,
                          shadow: p.shadow,
                          warp: p.warp,
                        });
                      });
                      commit();
                    }}
                  >
                    {p.name}
                  </button>
                  <button
                    className="text-gray-400 hover:text-red-600"
                    title="Delete preset"
                    onClick={() => deletePreset(p.id)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500">No presets yet. Create one using the Save button.</p>
          )}
        </div>

        {/* Text Content */}
        <div className="rounded-lg border border-gray-200 p-3 bg-white">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Text Content
          </label>
          <textarea
            value={layer.text}
            onChange={(e) => {
              const value = e.target.value;
              selectedLayers.forEach(l => updateLayer(l.id, { text: value }));
              if (textTimerRef.current) window.clearTimeout(textTimerRef.current);
              textTimerRef.current = window.setTimeout(() => {
                commit();
              }, 300);
            }}
            onBlur={() => commit()}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none bg-white text-gray-900 placeholder:text-gray-500 shadow-sm"
            rows={3}
            placeholder="Enter your text..."
          />
        </div>

        {/* Font Family */}
        <div className="rounded-lg border border-gray-200 p-3 bg-white">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Font Family
          </label>
          <FontDropdown
            fonts={fonts}
            selectedFont={layer.fontFamily}
            onFontChange={handleFontChange}
            loadedFonts={loadedFonts}
            onLoadFont={loadFont}
          />
          <div className="mt-2">
            <label className="block text-xs text-gray-500 mb-1">Upload Custom Font (TTF/OTF/WOFF/WOFF2)</label>
            <input
              type="file"
              accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,application/font-woff,application/font-woff2"
              onChange={(e) => onFontFileSelected(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-700 file:mr-3 file:py-1 file:px-2 file:rounded file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
        </div>

        {/* Font Size */}
        <div className="rounded-lg border border-gray-200 p-3 bg-white">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Font Size
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="range"
              min="8"
              max="200"
              value={layer.fontSize}
              onChange={(e) => handleUpdate('fontSize', parseInt(e.target.value))}
              className="flex-1"
            />
            <NumericInput
              value={layer.fontSize}
              onChange={(value) => handleUpdate('fontSize', value)}
              onCommit={commit}
              min={8}
              max={200}
              precision={0}
              suffix="px"
              className="w-16"
            />
          </div>
        </div>

        {/* Font Weight */}
        <div className="rounded-lg border border-gray-200 p-3 bg-white">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Font Weight
          </label>
          <select
            value={layer.fontWeight}
            onChange={(e) => handleUpdate('fontWeight', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 shadow-sm"
          >
            {FONT_WEIGHTS.map((weight) => (
              <option key={weight.value} value={weight.value}>
                {weight.label} ({weight.value})
              </option>
            ))}
          </select>
        </div>

        {/* Text Color */}
        <div className="rounded-lg border border-gray-200 p-3 bg-white">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Color
          </label>
          <ColorPicker
            value={layer.fill}
            onChange={setFillLive}
            onCommit={commit}
            swatches={colorSwatches}
          />
          {/* New: Palette from Image (dominant) with AA/AAA badges vs current text color */}
          {(paletteSwatches.length > 0) && (
            <div className="mt-3">
              <div className="text-xs text-gray-500 mb-1">From Image</div>
              <div className="flex flex-wrap gap-2">
                {paletteSwatches.map((hex) => {
                  const badges = getContrastBadges(hex, layer.fill);
                  return (
                    <button
                      key={hex}
                      title={`Contrast vs current text: ${badges.ratio}:1`}
                      onClick={() => handleUpdate('fill', hex)}
                      className="relative w-8 h-8 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ backgroundColor: hex }}
                    >
                      <div className="absolute -right-1 -top-1 flex space-x-0.5">
                        {badges.normal && (
                          <span className="px-1 py-0.5 text-[9px] leading-none rounded bg-white/80 text-gray-700 border border-gray-300">{badges.normal}</span>
                        )}
                        {badges.large && badges.large !== badges.normal && (
                          <span className="px-1 py-0.5 text-[9px] leading-none rounded bg-white/80 text-gray-700 border border-gray-300">L-{badges.large}</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* New: Harmony suggestions (complementary, triad) from top dominant */}
          {(harmonySwatches.length > 0) && (
            <div className="mt-3">
              <div className="text-xs text-gray-500 mb-1">Harmony</div>
              <div className="flex flex-wrap gap-2">
                {harmonySwatches.map((hex) => {
                  const badges = getContrastBadges(hex, layer.fill);
                  return (
                    <button
                      key={hex}
                      title={`Contrast vs current text: ${badges.ratio}:1`}
                      onClick={() => handleUpdate('fill', hex)}
                      className="relative w-8 h-8 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ backgroundColor: hex }}
                    >
                      <div className="absolute -right-1 -top-1 flex space-x-0.5">
                        {badges.normal && (
                          <span className="px-1 py-0.5 text-[9px] leading-none rounded bg-white/80 text-gray-700 border border-gray-300">{badges.normal}</span>
                        )}
                        {badges.large && badges.large !== badges.normal && (
                          <span className="px-1 py-0.5 text-[9px] leading-none rounded bg-white/80 text-gray-700 border border-gray-300">L-{badges.large}</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Text Alignment */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Alignment
          </label>
          <div className="flex space-x-1">
            {ALIGNMENTS.map((alignment) => (
              <button
                key={alignment.value}
                onClick={() => handleUpdate('align', alignment.value)}
                className={`flex-1 px-3 py-2 text-sm border rounded-md transition-colors ${
                  layer.align === alignment.value
                    ? 'bg-blue-100 border-blue-300 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {alignment.label}
              </button>
            ))}
          </div>
        </div>

        {/* Line Height */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Line Height
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="range"
              min="0.8"
              max="3.0"
              step="0.1"
              value={layer.lineHeight || 1.2}
              onChange={(e) => handleUpdate('lineHeight', parseFloat(e.target.value))}
              className="flex-1"
            />
            <NumericInput
              value={layer.lineHeight || 1.2}
              onChange={(value) => handleUpdate('lineHeight', value)}
              onCommit={commit}
              min={0.8}
              max={3.0}
              step={0.1}
              precision={1}
              className="w-16"
            />
          </div>
        </div>

        {/* Letter Spacing */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Letter Spacing
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="range"
              min="-50"
              max="100"
              step="1"
              value={layer.letterSpacing || 0}
              onChange={(e) => handleUpdate('letterSpacing', parseInt(e.target.value))}
              className="flex-1"
            />
            <NumericInput
              value={layer.letterSpacing || 0}
              onChange={(value) => handleUpdate('letterSpacing', value)}
              onCommit={commit}
              min={-50}
              max={100}
              precision={0}
              suffix="px"
              className="w-16"
            />
          </div>
        </div>

        {/* Text Shadow */}
        <div className="rounded-lg border border-gray-200 p-3 bg-white">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-900">Text Shadow</label>
            <button
              className={`text-sm px-2 py-0.5 rounded border ${layer.shadow ? 'text-red-700 bg-red-50 border-red-200' : 'text-green-700 bg-green-50 border-green-200'}`}
              onClick={() => {
                if (layer.shadow) {
                  selectedLayers.forEach(l => updateLayer(l.id, { shadow: undefined }));
                  commit();
                } else {
                  handleShadowChange({});
                }
              }}
            >
              {layer.shadow ? 'Disable' : 'Enable'}
            </button>
          </div>
          {layer.shadow && (
            <div className="space-y-3">
              <div>
                <div className="text-xs text-gray-500 mb-1">Color</div>
                <ColorPicker
                  value={layer.shadow.color}
                  onChange={(c) => handleShadowChange({ color: c })}
                  onCommit={commit}
                />
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Blur</div>
                <div className="flex items-center space-x-2">
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="1"
                    value={layer.shadow.blur}
                    onChange={(e) => handleShadowChange({ blur: parseInt(e.target.value) })}
                    className="flex-1"
                  />
                  <NumericInput
                    value={layer.shadow.blur}
                    onChange={(v) => handleShadowChange({ blur: v })}
                    onCommit={commit}
                    min={0}
                    max={50}
                    precision={0}
                    className="w-16"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Offset X</div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="range"
                      min="-50"
                      max="50"
                      step="1"
                      value={layer.shadow.offsetX}
                      onChange={(e) => handleShadowChange({ offsetX: parseInt(e.target.value) })}
                      className="flex-1"
                    />
                    <NumericInput
                      value={layer.shadow.offsetX}
                      onChange={(v) => handleShadowChange({ offsetX: v })}
                      onCommit={commit}
                      min={-50}
                      max={50}
                      precision={0}
                    />
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Offset Y</div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="range"
                      min="-50"
                      max="50"
                      step="1"
                      value={layer.shadow.offsetY}
                      onChange={(e) => handleShadowChange({ offsetY: parseInt(e.target.value) })}
                      className="flex-1"
                    />
                    <NumericInput
                      value={layer.shadow.offsetY}
                      onChange={(v) => handleShadowChange({ offsetY: v })}
                      onCommit={commit}
                      min={-50}
                      max={50}
                      precision={0}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Warp / Curved Text */}
        <div className="rounded-lg border border-gray-200 p-3 bg-white">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-900">Curved Text</label>
            <button
              className={`text-sm px-2 py-0.5 rounded border ${layer.warp?.type === 'arc' ? 'text-red-700 bg-red-50 border-red-200' : 'text-green-700 bg-green-50 border-green-200'}`}
              onClick={() => {
                if (layer.warp?.type === 'arc') {
                  selectedLayers.forEach(l => updateLayer(l.id, { warp: { ...(l.warp || { radius: 150, direction: 'up', spacing: 0 }), type: 'none' } }));
                  commit();
                } else {
                  handleWarpChange({ type: 'arc' });
                }
              }}
            >
              {layer.warp?.type === 'arc' ? 'Disable' : 'Enable'}
            </button>
          </div>
          {layer.warp?.type === 'arc' && (
            <div className="space-y-3">
              <div>
                <div className="text-xs text-gray-500 mb-1">Radius</div>
                <div className="flex items-center space-x-2">
                  <input
                    type="range"
                    min="20"
                    max="2000"
                    step="5"
                    value={layer.warp.radius}
                    onChange={(e) => handleWarpChange({ radius: parseInt(e.target.value) })}
                    className="flex-1"
                  />
                  <NumericInput
                    value={layer.warp.radius}
                    onChange={(v) => handleWarpChange({ radius: v })}
                    onCommit={commit}
                    min={20}
                    max={2000}
                    precision={0}
                    suffix="px"
                    className="w-20"
                  />
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Direction</div>
                <div className="flex space-x-1">
                  {(['up','down'] as const).map(dir => (
                    <button
                      key={dir}
                      onClick={() => handleWarpChange({ direction: dir })}
                      className={`flex-1 px-3 py-2 text-sm border rounded-md ${layer.warp?.direction === dir ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                    >
                      {dir.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Extra Spacing</div>
                <div className="flex items-center space-x-2">
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="1"
                    value={layer.warp.spacing || 0}
                    onChange={(e) => handleWarpChange({ spacing: parseInt(e.target.value) })}
                    className="flex-1"
                  />
                  <NumericInput
                    value={layer.warp.spacing || 0}
                    onChange={(v) => handleWarpChange({ spacing: v })}
                    onCommit={commit}
                    min={0}
                    max={50}
                    precision={0}
                    suffix="px"
                    className="w-16"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Opacity */}
        <div className="rounded-lg border border-gray-200 p-3 bg-white">
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Opacity
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={layer.opacity}
              onChange={(e) => handleUpdate('opacity', parseFloat(e.target.value))}
              className="flex-1"
            />
            <NumericInput
              value={Math.round(layer.opacity * 100)}
              onChange={(value) => handleUpdate('opacity', value / 100)}
              onCommit={commit}
              min={0}
              max={100}
              precision={0}
              suffix="%"
              className="w-16"
            />
          </div>
        </div>

        {/* Position */}
        <div className="rounded-lg border border-gray-200 p-3 bg-white">
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Position
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">X</label>
              <NumericInput
                value={layer.x}
                onChange={(value) => handleUpdate('x', value)}
                onCommit={commit}
                precision={0}
                suffix="px"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Y</label>
              <NumericInput
                value={layer.y}
                onChange={(value) => handleUpdate('y', value)}
                onCommit={commit}
                precision={0}
                suffix="px"
              />
            </div>
          </div>
        </div>

        {/* Size */}
        <div className="rounded-lg border border-gray-200 p-3 bg-white">
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Size
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Width</label>
              <NumericInput
                value={layer.width}
                onChange={(value) => handleUpdate('width', value)}
                onCommit={commit}
                min={1}
                precision={0}
                suffix="px"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Height</label>
              <NumericInput
                value={layer.height}
                onChange={(value) => handleUpdate('height', value)}
                onCommit={commit}
                min={1}
                precision={0}
                suffix="px"
              />
            </div>
          </div>
        </div>

        {/* Rotation */}
        <div className="rounded-lg border border-gray-200 p-3 bg-white">
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Rotation
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="range"
              min="-180"
              max="180"
              value={layer.rotation}
              onChange={(e) => handleUpdate('rotation', parseInt(e.target.value))}
              className="flex-1"
            />
            <NumericInput
              value={layer.rotation}
              onChange={(value) => handleUpdate('rotation', value)}
              onCommit={commit}
              min={-180}
              max={180}
              precision={0}
              suffix="°"
              className="w-16"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
