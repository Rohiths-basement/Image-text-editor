'use client';

import React, { useState } from 'react';
import { useEditor, useHasBackground } from '@/editor/store';
import { ImageUpload } from './ImageUpload';
import { ExportButton } from './ExportButton';
import { HistoryIndicator } from './HistoryIndicator';
import { AlignTools } from './AlignTools';
import { getHeatmap, suggestPlacement } from '@/editor/magicPlace';
import { encodeSharePayload } from '@/utils/share';

export const Toolbar: React.FC = () => {
  const {
    addTextLayer,
    reset,
    zoom,
    setZoom,
    selectedIds,
    deleteLayer,
    bg,
    layers,
    updateLayer,
    commit,
    setActiveGuides,
    clearGuides,
  } = useEditor();
  const presets = useEditor((s) => s.presets);

  const hasBackground = useHasBackground();

  const handleAddText = () => {
    if (!hasBackground) {
      alert('Please upload a PNG image first.');
      return;
    }
    addTextLayer();
  };

  const [shareCopied, setShareCopied] = useState(false);
  const handleShareCopy = async () => {
    try {
      // Build sharable document
      const doc = {
        v: 1 as const,
        bg,
        layers,
        zoom,
        presets,
      };
      const encoded = encodeSharePayload(doc);
      const base = typeof window !== 'undefined'
        ? window.location.origin + window.location.pathname
        : '';
      const url = `${base}#s=${encoded}`;
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 1500);
    } catch (e) {
      console.error('Failed to copy share link', e);
      alert('Failed to copy link');
    }
  };

  const handleDelete = () => {
    if (selectedIds.length > 0) {
      selectedIds.forEach(id => deleteLayer(id));
    }
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset? This will clear all your work.')) {
      localStorage.removeItem('itc-autosave');
      reset();
    }
  };

  const handleMagicPlace = async () => {
    if (!bg || selectedIds.length === 0) return;
    try {
      const heat = await getHeatmap(bg.src, bg.width, bg.height);
      const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);

      const animations: Array<() => Promise<void>> = [];

      let guidesShown = false;
      selectedIds.forEach((id, idx) => {
        const layer = layers.find((l) => l.id === id);
        if (!layer) return;
        const avoidRects = layers
          .filter((l) => l.id !== id)
          .map((l) => ({ x: l.x, y: l.y, width: l.width, height: l.height }));

        const { x: tx, y: ty } = suggestPlacement({
          heatmap: heat,
          textW: Math.max(1, layer.width),
          textH: Math.max(1, layer.height),
          textColor: layer.fill,
          alpha: 0.6,
          beta: 0.4,
          margin: 12,
          avoidRects,
          avoidPadding: 8,
        });

        const sx = layer.x;
        const sy = layer.y;
        const dx = tx - sx;
        const dy = ty - sy;

        // Show a brief guide overlay around the target for the first processed layer
        if (!guidesShown) {
          guidesShown = true;
          setActiveGuides([
            { type: 'horizontal', position: ty, from: { x: tx, y: ty }, to: { x: tx + layer.width, y: ty }, label: 'Magic Place' },
            { type: 'vertical', position: tx, from: { x: tx, y: ty }, to: { x: tx, y: ty + layer.height } },
            { type: 'horizontal', position: ty + layer.height, from: { x: tx, y: ty + layer.height }, to: { x: tx + layer.width, y: ty + layer.height } },
            { type: 'vertical', position: tx + layer.width, from: { x: tx + layer.width, y: ty }, to: { x: tx + layer.width, y: ty + layer.height } },
          ]);
          setTimeout(() => clearGuides(), 900);
        }

        animations.push(() => new Promise<void>((resolve) => {
          const duration = 220;
          const start = performance.now();
          const step = () => {
            const now = performance.now();
            const t = Math.min(1, (now - start) / duration);
            const k = easeInOut(t);
            updateLayer(id, { x: Math.round(sx + dx * k), y: Math.round(sy + dy * k) });
            if (t < 1) requestAnimationFrame(step);
            else resolve();
          };
          requestAnimationFrame(step);
        }));
      });

      // Run animations sequentially for deterministic commit
      for (const run of animations) {
        await run();
      }
      commit();
    } catch (e) {
      // noop: if anything fails, silently ignore to keep UI snappy
      console.error('Magic Place failed', e);
    }
  };

  const handleZoomIn = () => setZoom(Math.min(5, zoom + 0.1));
  const handleZoomOut = () => setZoom(Math.max(0.1, zoom - 0.1));
  const handleZoomReset = () => setZoom(1);

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <ImageUpload />
        
        <div className="h-6 w-px bg-gray-300" />
        
        <button
          onClick={handleAddText}
          disabled={!hasBackground}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          Add Text
        </button>

        <button
          onClick={handleDelete}
          disabled={selectedIds.length === 0}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          Delete
        </button>

        <div className="h-6 w-px bg-gray-300" />

        <AlignTools />

        <div className="h-6 w-px bg-gray-300" />

        <button
          onClick={handleMagicPlace}
          disabled={!hasBackground || selectedIds.length === 0}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          title="Automatically move selected text to the most readable spot (low clutter, high contrast), avoiding overlap with other text boxes"
        >
          Magic Place
        </button>

        <HistoryIndicator />
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <button
            onClick={handleZoomOut}
            className="px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
          >
            −
          </button>
          
          <button
            onClick={handleZoomReset}
            className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors min-w-[60px]"
          >
            {Math.round(zoom * 100)}%
          </button>
          
          <button
            onClick={handleZoomIn}
            className="px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
          >
            +
          </button>
        </div>

        <div className="h-6 w-px bg-gray-300" />

        <ExportButton />

        <button
          onClick={handleShareCopy}
          disabled={!hasBackground}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          title="Copy a shareable link that restores this composition"
        >
          {shareCopied ? 'Copied!' : 'Share'}
        </button>

        <button
          onClick={handleReset}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
        >
          Reset
        </button>
      </div>
    </div>
  );
};
