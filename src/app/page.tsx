'use client';

import React, { useEffect, useState } from 'react';
import { Toolbar } from '@/components/Toolbar';
import { LayersPanel } from '@/components/LayersPanel';
import { InspectorPanel } from '@/components/InspectorPanel';
import dynamic from 'next/dynamic';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useEditor } from '@/editor/store';
import { decodeSharePayload } from '@/utils/share';
import type { ShareDoc } from '@/editor/types';
import { ensureGoogleFontLoaded } from '@/utils/fonts';

// Narrow unknown to a v1 shareable document-like object without using 'any'
function hasV1(x: unknown): x is { v: 1 } {
  return (
    typeof x === 'object' &&
    x !== null &&
    'v' in x &&
    // Use a precise cast to avoid 'any'
    (x as { v: unknown }).v === 1
  );
}

type PersistApi = {
  hasHydrated?: () => boolean;
  onFinishHydration?: (fn: () => void) => () => void;
};

const EditorCanvas = dynamic(
  () => import('@/components/EditorCanvas').then((m) => m.EditorCanvas),
  { ssr: false }
);

export default function Home() {
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  // Select individual pieces from the store to avoid subscribing to the entire state
  const bg = useEditor((s) => s.bg);
  const zoom = useEditor((s) => s.zoom);
  const setZoom = useEditor((s) => s.setZoom);
  const hydrateFromShare = useEditor((s) => s.hydrateFromShare);
  const layers = useEditor((s) => s.layers);
  const presets = useEditor((s) => s.presets);

  // Enable keyboard shortcuts
  useKeyboardShortcuts();

  // Hydrate from shareable link (#s=...) on first load, AFTER autosave rehydration to avoid race
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const run = () => {
      const hash = window.location.hash;
      const match = hash.match(/^#s=(.+)$/);
      if (!match) return;
      const encoded = match[1];
      const doc = decodeSharePayload(encoded) as unknown;
      if (hasV1(doc)) {
        const candidate = doc as Partial<ShareDoc>;
        if (Array.isArray(candidate.layers)) {
          hydrateFromShare(candidate as ShareDoc);
        }
        // Clear hash but preserve path and query
        const base = window.location.origin + window.location.pathname + window.location.search;
        window.history.replaceState(null, '', base);
      }
    };
    const api = (useEditor as unknown as { persist?: PersistApi }).persist;
    if (api?.hasHydrated?.()) {
      run();
      return;
    }
    const unsub = api?.onFinishHydration?.(() => run());
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [hydrateFromShare]);

  // Ensure Google fonts used in current layers and presets are preloaded
  useEffect(() => {
    try {
      const fams = new Set<string>();
      layers.forEach((l) => l.fontFamily && fams.add(l.fontFamily));
      presets.forEach((p) => p.fontFamily && fams.add(p.fontFamily));
      fams.forEach((f) => ensureGoogleFontLoaded(f));
    } catch {
      // ignore
    }
  }, [layers, presets]);

  // Calculate canvas size based on window and background image
  useEffect(() => {
    const updateCanvasSize = () => {
      const viewportWidth = window.innerWidth - 640; // Account for side panels (320px each)
      const viewportHeight = window.innerHeight - 120; // Account for toolbar and status bar

      if (bg) {
        // Auto-fit zoom when background changes
        const scaleX = viewportWidth / bg.width;
        const scaleY = viewportHeight / bg.height;
        const autoZoom = Math.min(scaleX, scaleY, 1); // Don't zoom in beyond 100%

        // Only update zoom if it actually changes to prevent feedback loops
        if (Math.abs(zoom - autoZoom) > 0.001) {
          setZoom(autoZoom);
        }
        setCanvasSize({
          width: Math.min(viewportWidth, bg.width * autoZoom),
          height: Math.min(viewportHeight, bg.height * autoZoom),
        });
      } else {
        setCanvasSize({
          width: Math.min(viewportWidth, 800),
          height: Math.min(viewportHeight, 600),
        });
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [bg, zoom, setZoom]);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Toolbar */}
      <Toolbar />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Layers Panel */}
        <LayersPanel />

        {/* Canvas Area */}
        <div className="flex-1 flex flex-col">
          <EditorCanvas 
            width={canvasSize.width} 
            height={canvasSize.height} 
          />
          
          {/* Status Bar */}
          <div className="bg-white border-t border-gray-200 px-4 py-2 text-sm text-gray-600">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {bg && (
                  <span>
                    Canvas: {bg.width} × {bg.height}px
                  </span>
                )}
                <span>
                  Zoom: {Math.round(zoom * 100)}%
                </span>
              </div>
              
              <div className="text-xs text-gray-500">
                <span className="mr-4">⌘Z Undo</span>
                <span className="mr-4">⌘⇧Z Redo</span>
                <span className="mr-4">T Add Text</span>
                <span className="mr-4">⌘D Duplicate</span>
                <span>⌫ Delete</span>
              </div>
            </div>
          </div>
        </div>

        {/* Inspector Panel */}
        <InspectorPanel />
      </div>
    </div>
  );
}
