export type LayerId = string;

export interface TextLayer {
  id: LayerId;
  type: 'text';
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number | string;
  fill: string;
  opacity: number;
  align: 'left' | 'center' | 'right';
  lineHeight?: number;
  letterSpacing?: number;
  shadow?: {
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
  };
  locked?: boolean;
  visible?: boolean;
  warp?: {
    type: 'none' | 'arc';
    radius: number; // px
    direction?: 'up' | 'down';
    spacing?: number; // additional px between characters
  };
};

export type BackgroundImage = {
  src: string; // dataURL
  width: number;
  height: number;
};

export type EditorState = {
  bg?: BackgroundImage | null; // uploaded PNG (dataURL)
  layers: TextLayer[]; // order = stacking (index 0 = back)
  selectedIds: LayerId[]; // multi-select support
  zoom: number; // viewport zoom; does not affect export
  history: { 
    past: string[]; 
    future: string[]; 
  }; // JSON snapshots (<=20)
  lastSavedAt?: number;
  activeGuides: GuideLine[]; // ephemeral visual guides while dragging/resizing (not persisted)
  presets: TextStylePreset[]; // saved text style presets (persisted)
};

export type EditorActions = {
  setBg: (bg: BackgroundImage | null) => void;
  addTextLayer: (partial?: Partial<TextLayer>) => void;
  updateLayer: (id: LayerId, patch: Partial<TextLayer>) => void;
  deleteLayer: (id: LayerId) => void;
  duplicateLayer: (id: LayerId) => void;
  reorderLayers: (idsInOrder: LayerId[]) => void;
  selectLayers: (ids: LayerId[]) => void;
  setZoom: (zoom: number) => void;
  commit: () => void;
  undo: () => void;
  redo: () => void;
  reset: () => void;
  setActiveGuides: (guides: GuideLine[]) => void;
  clearGuides: () => void;
  addPreset: (preset: TextStylePreset) => void;
  deletePreset: (id: string) => void;
  // Hydrate the editor from a shareable document payload (no autosave interference)
  hydrateFromShare: (doc: ShareDoc) => void;
};

export type GoogleFont = {
  family: string;
  variants: string[];
  subsets: string[];
  category: string;
};

export type GoogleFontsResponse = {
  items: GoogleFont[];
};

// Visual guide line used for snapping hints
export type GuideLine = {
  type: 'vertical' | 'horizontal';
  position: number;
  // Optional endpoints for measurement lines (if provided, draw a segment instead of full-span)
  from?: { x: number; y: number };
  to?: { x: number; y: number };
  label?: string; // Optional text label (e.g., spacing measurement)
};

// Saved text style preset
export type TextStylePreset = {
  id: string;
  name: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number | string;
  fill: string;
  lineHeight?: number;
  letterSpacing?: number;
  shadow?: {
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
  };
  warp?: TextLayer['warp'];
};

// Minimal document shape used for shareable links
export type ShareDoc = {
  v: 1;
  bg: BackgroundImage | null;
  layers: TextLayer[];
  zoom?: number;
  presets?: TextStylePreset[];
};
