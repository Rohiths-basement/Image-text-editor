import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { EditorState, EditorActions, TextLayer, BackgroundImage, LayerId, ShareDoc } from './types';

const initialState: EditorState = {
  bg: null,
  layers: [],
  selectedIds: [],
  zoom: 1,
  history: { past: [], future: [] },
  // Use a deterministic value for SSR snapshots to avoid React 19 getServerSnapshot loop
  lastSavedAt: 0,
  activeGuides: [],
  presets: [],
};

export const useEditor = create<EditorState & EditorActions>()(
  persist(
    immer((set) => ({
      ...initialState,

      setBg: (bg: BackgroundImage | null) => 
        set((state) => {
          state.bg = bg;
          // Clear history when new background is uploaded
          if (bg) {
            state.history = { past: [], future: [] };
            state.selectedIds = [];
          }
        }),

      setActiveGuides: (guides) =>
        set((state) => {
          state.activeGuides = guides;
        }),

      clearGuides: () =>
        set((state) => {
          state.activeGuides = [];
        }),

      addPreset: (preset) =>
        set((state) => {
          state.presets.push(preset);
        }),

      deletePreset: (id) =>
        set((state) => {
          state.presets = state.presets.filter((p) => p.id !== id);
        }),

      addTextLayer: (partial: Partial<TextLayer> = {}) =>
        set((state) => {
          const newLayer: TextLayer = {
            id: crypto.randomUUID(),
            type: 'text',
            name: `Text ${state.layers.length + 1}`,
            x: 100,
            y: 100,
            width: 300,
            height: 80,
            rotation: 0,
            text: 'Double-click to edit',
            fontFamily: 'Inter',
            fontSize: 48,
            fontWeight: 600,
            fill: '#000000',
            opacity: 1,
            align: 'left',
            ...partial,
          };
          state.layers.push(newLayer);
          state.selectedIds = [newLayer.id];
        }),

      updateLayer: (id: LayerId, patch: Partial<TextLayer>) =>
        set((state) => {
          const layer = state.layers.find((l) => l.id === id);
          if (layer) {
            Object.assign(layer, patch);
          }
        }),

      deleteLayer: (id: LayerId) =>
        set((state) => {
          state.layers = state.layers.filter((l) => l.id !== id);
          state.selectedIds = state.selectedIds.filter((selectedId) => selectedId !== id);
        }),

      duplicateLayer: (id: LayerId) =>
        set((state) => {
          const layer = state.layers.find((l) => l.id === id);
          if (layer) {
            const duplicated: TextLayer = {
              ...layer,
              id: crypto.randomUUID(),
              name: `${layer.name} copy`,
              x: layer.x + 16,
              y: layer.y + 16,
            };
            state.layers.push(duplicated);
            state.selectedIds = [duplicated.id];
          }
        }),

      reorderLayers: (idsInOrder: LayerId[]) =>
        set((state) => {
          const reorderedLayers = idsInOrder
            .map((id) => state.layers.find((l) => l.id === id))
            .filter(Boolean) as TextLayer[];
          state.layers = reorderedLayers;
        }),

      selectLayers: (ids: LayerId[]) =>
        set((state) => {
          state.selectedIds = ids;
        }),

      setZoom: (zoom: number) =>
        set((state) => {
          state.zoom = Math.max(0.1, Math.min(5, zoom));
        }),

      commit: () =>
        set((state) => {
          const snapshot = JSON.stringify({
            bg: state.bg,
            layers: state.layers,
            selectedIds: state.selectedIds,
            zoom: state.zoom,
          });
          
          state.history.past.push(snapshot);
          
          // Keep only last 50 snapshots
          if (state.history.past.length > 50) {
            state.history.past.shift();
          }
          
          // Clear future when new action is committed
          state.history.future = [];
          state.lastSavedAt = Date.now();
        }),

      undo: () =>
        set((state) => {
          const snapshot = state.history.past.pop();
          if (!snapshot) return;

          // Save current state to future
          const currentSnapshot = JSON.stringify({
            bg: state.bg,
            layers: state.layers,
            selectedIds: state.selectedIds,
            zoom: state.zoom,
          });
          state.history.future.push(currentSnapshot);

          // Restore previous state
          const previousState = JSON.parse(snapshot);
          state.bg = previousState.bg;
          state.layers = previousState.layers;
          state.selectedIds = previousState.selectedIds;
          state.zoom = previousState.zoom;
        }),

      redo: () =>
        set((state) => {
          const snapshot = state.history.future.pop();
          if (!snapshot) return;

          // Save current state to past
          const currentSnapshot = JSON.stringify({
            bg: state.bg,
            layers: state.layers,
            selectedIds: state.selectedIds,
            zoom: state.zoom,
          });
          state.history.past.push(currentSnapshot);

          // Restore future state
          const futureState = JSON.parse(snapshot);
          state.bg = futureState.bg;
          state.layers = futureState.layers;
          state.selectedIds = futureState.selectedIds;
          state.zoom = futureState.zoom;
        }),

      reset: () =>
        set(() => ({
          ...initialState,
          lastSavedAt: Date.now(),
        })),

      hydrateFromShare: (doc: ShareDoc) =>
        set((state) => {
          if (!doc || doc.v !== 1) return;
          // Basic validation
          const nextBg = doc.bg ?? null;
          const nextLayers = Array.isArray(doc.layers) ? (doc.layers as TextLayer[]) : [];
          const nextZoom = typeof doc.zoom === 'number' ? Math.max(0.1, Math.min(5, doc.zoom)) : 1;
          const nextPresets = Array.isArray(doc.presets) ? doc.presets : [];

          state.bg = nextBg;
          state.layers = nextLayers;
          state.selectedIds = [];
          state.zoom = nextZoom;
          state.presets = nextPresets;

          // Clear history to avoid mixing timelines
          state.history = { past: [], future: [] };
          state.lastSavedAt = Date.now();
        }),
    })),
    {
      name: 'itc-autosave',
      partialize: (state) => ({
        bg: state.bg,
        layers: state.layers,
        selectedIds: state.selectedIds,
        zoom: state.zoom,
        lastSavedAt: state.lastSavedAt,
        presets: state.presets,
      }),
    }
  )
);

// Provide a stable server snapshot for React 18/19 SSR to avoid infinite loops
// Returning the same object reference prevents "getServerSnapshot should be cached" errors
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(useEditor as any).getServerState = () => initialState;

// Selectors for computed values
export const useCanUndo = () => useEditor((state) => state.history.past.length > 0);
export const useCanRedo = () => useEditor((state) => state.history.future.length > 0);
export const useUndoCount = () => useEditor((state) => state.history.past.length);
export const useRedoCount = () => useEditor((state) => state.history.future.length);
export const useSelectedLayers = (): TextLayer[] =>
  useEditor(
    useShallow((state) =>
      state.layers.filter((layer) => state.selectedIds.includes(layer.id))
    )
  );
export const useHasBackground = () => useEditor((state) => !!state.bg);
