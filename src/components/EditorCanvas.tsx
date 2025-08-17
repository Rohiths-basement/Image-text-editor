'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Stage, Layer, Image as KonvaImage, Rect, Transformer } from 'react-konva';
import type Konva from 'konva';
import { useEditor } from '@/editor/store';
import { TextNode } from './TextNode';
import { Guides } from './Guides';
import type { GuideLine } from '@/editor/types';

interface EditorCanvasProps {
  width: number;
  height: number;
}

type TransformAttrs = { x: number; y: number; width: number; height: number; rotation: number };

export const EditorCanvas: React.FC<EditorCanvasProps> = ({ width, height }) => {
  const stageRef = useRef<Konva.Stage>(null);
  const groupTransformerRef = useRef<Konva.Transformer>(null);
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [isMarqueeSelecting, setIsMarqueeSelecting] = useState(false);
  const [marqueeStart, setMarqueeStart] = useState<{ x: number; y: number } | null>(null);
  const [marqueeRect, setMarqueeRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  
  const {
    bg,
    layers,
    selectedIds,
    zoom,
    selectLayers,
    updateLayer,
    deleteLayer,
    commit,
    setActiveGuides,
    clearGuides,
  } = useEditor();

  // Load background image
  useEffect(() => {
    if (!bg?.src) {
      setBgImage(null);
      return;
    }

    const img = new window.Image();
    img.onload = () => setBgImage(img);
    img.src = bg.src;
  }, [bg?.src]);

  // Calculate stage dimensions and scale
  const stageWidth = bg?.width || width;
  const stageHeight = bg?.height || height;
  const scale = zoom;

  // Handle stage click for deselection
  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    // If clicked on stage background, deselect all
    if (e.target === e.target.getStage()) {
      selectLayers([]);
    }
  }, [selectLayers]);

  // Helper: get stage-local pointer position taking scale into account
  const getStagePointer = () => {
    const stage = stageRef.current;
    if (!stage) return null;
    const pos = stage.getPointerPosition();
    if (!pos) return null;
    return { x: pos.x / scale, y: pos.y / scale };
  };

  // Compute snapping against canvas and other layers
  const computeSnapping = useCallback((
    target: { id?: string; x: number; y: number; width: number; height: number },
  ) => {
    const threshold = 6 / scale;

    type Rect = { x: number; y: number; width: number; height: number };
    type VGuide = {
      position: number;
      source:
        | { type: 'canvas'; edge: 'left' | 'center' | 'right' }
        | { type: 'layer'; id: string; rect: Rect; edge: 'left' | 'center' | 'right' };
    };
    type HGuide = {
      position: number;
      source:
        | { type: 'canvas'; edge: 'top' | 'center' | 'bottom' }
        | { type: 'layer'; id: string; rect: Rect; edge: 'top' | 'center' | 'bottom' };
    };

    const guidesV: VGuide[] = [
      { position: 0, source: { type: 'canvas', edge: 'left' } },
      { position: stageWidth / 2, source: { type: 'canvas', edge: 'center' } },
      { position: stageWidth, source: { type: 'canvas', edge: 'right' } },
    ];
    const guidesH: HGuide[] = [
      { position: 0, source: { type: 'canvas', edge: 'top' } },
      { position: stageHeight / 2, source: { type: 'canvas', edge: 'center' } },
      { position: stageHeight, source: { type: 'canvas', edge: 'bottom' } },
    ];

    // Add other layers' edges and centers with metadata
    layers.forEach((l) => {
      if (target.id && l.id === target.id) return;
      const rect: Rect = { x: l.x, y: l.y, width: l.width, height: l.height };
      guidesV.push(
        { position: l.x, source: { type: 'layer', id: l.id, rect, edge: 'left' } },
        { position: l.x + l.width / 2, source: { type: 'layer', id: l.id, rect, edge: 'center' } },
        { position: l.x + l.width, source: { type: 'layer', id: l.id, rect, edge: 'right' } },
      );
      guidesH.push(
        { position: l.y, source: { type: 'layer', id: l.id, rect, edge: 'top' } },
        { position: l.y + l.height / 2, source: { type: 'layer', id: l.id, rect, edge: 'center' } },
        { position: l.y + l.height, source: { type: 'layer', id: l.id, rect, edge: 'bottom' } },
      );
    });

    let snappedX = target.x;
    let snappedY = target.y;
    const active: GuideLine[] = [];

    // Helpers
    const horizontalOverlap = (a: Rect, b: Rect) => Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
    const verticalOverlap = (a: Rect, b: Rect) => Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);

    // Vertical snapping (x axis)
    const left = target.x;
    const centerX = target.x + target.width / 2;
    const right = target.x + target.width;

    let bestVDiff = Infinity;
    let bestV: VGuide | null = null;
    let bestVAlignment: 'left' | 'center' | 'right' | null = null;

    for (const g of guidesV) {
      const dl = Math.abs(left - g.position);
      const dc = Math.abs(centerX - g.position);
      const dr = Math.abs(right - g.position);

      if (dl < bestVDiff && dl < threshold) {
        bestVDiff = dl; bestV = g; bestVAlignment = 'left';
        snappedX = g.position; // align left
      }
      if (dc < bestVDiff && dc < threshold) {
        bestVDiff = dc; bestV = g; bestVAlignment = 'center';
        snappedX = g.position - target.width / 2;
      }
      if (dr < bestVDiff && dr < threshold) {
        bestVDiff = dr; bestV = g; bestVAlignment = 'right';
        snappedX = g.position - target.width;
      }
    }

    // Horizontal snapping (y axis)
    const top = target.y;
    const centerY = target.y + target.height / 2;
    const bottom = target.y + target.height;

    let bestHDiff = Infinity;
    let bestH: HGuide | null = null;
    let bestHAlignment: 'top' | 'center' | 'bottom' | null = null;

    for (const g of guidesH) {
      const dt = Math.abs(top - g.position);
      const dc = Math.abs(centerY - g.position);
      const db = Math.abs(bottom - g.position);

      if (dt < bestHDiff && dt < threshold) {
        bestHDiff = dt; bestH = g; bestHAlignment = 'top';
        snappedY = g.position; // align top
      }
      if (dc < bestHDiff && dc < threshold) {
        bestHDiff = dc; bestH = g; bestHAlignment = 'center';
        snappedY = g.position - target.height / 2;
      }
      if (db < bestHDiff && db < threshold) {
        bestHDiff = db; bestH = g; bestHAlignment = 'bottom';
        snappedY = g.position - target.height;
      }
    }

    // Build guides with optional spacing measurements
    const tgtRect: Rect = { x: snappedX, y: snappedY, width: target.width, height: target.height };

    if (bestV) {
      let addedSpacing = false;
      if (bestV.source.type === 'layer' && bestVAlignment !== 'center') {
        const src = bestV.source.rect;
        const overlap = horizontalOverlap(src, tgtRect);
        if (overlap > 0) {
          // Determine vertical gap
          if (tgtRect.y + tgtRect.height <= src.y) {
            const gap = src.y - (tgtRect.y + tgtRect.height);
            if (gap > 0) {
              active.push({
                type: 'vertical',
                position: bestV.position,
                from: { x: bestV.position, y: tgtRect.y + tgtRect.height },
                to: { x: bestV.position, y: src.y },
                label: `${Math.round(gap)}px`,
              });
              addedSpacing = true;
            }
          } else if (src.y + src.height <= tgtRect.y) {
            const gap = tgtRect.y - (src.y + src.height);
            if (gap > 0) {
              active.push({
                type: 'vertical',
                position: bestV.position,
                from: { x: bestV.position, y: src.y + src.height },
                to: { x: bestV.position, y: tgtRect.y },
                label: `${Math.round(gap)}px`,
              });
              addedSpacing = true;
            }
          }
        }
      }
      if (!addedSpacing) {
        active.push({ type: 'vertical', position: bestV.position });
      }
    }

    if (bestH) {
      let addedSpacing = false;
      if (bestH.source.type === 'layer' && bestHAlignment !== 'center') {
        const src = bestH.source.rect;
        const overlap = verticalOverlap(src, tgtRect);
        if (overlap > 0) {
          // Determine horizontal gap
          if (tgtRect.x + tgtRect.width <= src.x) {
            const gap = src.x - (tgtRect.x + tgtRect.width);
            if (gap > 0) {
              active.push({
                type: 'horizontal',
                position: bestH.position,
                from: { x: tgtRect.x + tgtRect.width, y: bestH.position },
                to: { x: src.x, y: bestH.position },
                label: `${Math.round(gap)}px`,
              });
              addedSpacing = true;
            }
          } else if (src.x + src.width <= tgtRect.x) {
            const gap = tgtRect.x - (src.x + src.width);
            if (gap > 0) {
              active.push({
                type: 'horizontal',
                position: bestH.position,
                from: { x: src.x + src.width, y: bestH.position },
                to: { x: tgtRect.x, y: bestH.position },
                label: `${Math.round(gap)}px`,
              });
              addedSpacing = true;
            }
          }
        }
      }
      if (!addedSpacing) {
        active.push({ type: 'horizontal', position: bestH.position });
      }
    }

    return { x: snappedX, y: snappedY, guides: active };
  }, [layers, stageWidth, stageHeight, scale]);

  // Stage marquee selection handlers
  const handleStageMouseDown = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    // start marquee only if clicked on empty stage (not a node)
    if (e.target !== e.target.getStage()) return;
    const pt = getStagePointer();
    if (!pt) return;
    setIsMarqueeSelecting(true);
    setMarqueeStart(pt);
    setMarqueeRect({ x: pt.x, y: pt.y, width: 0, height: 0 });
    // if no additive key pressed, clear selection
    if (!(e.evt.shiftKey || e.evt.metaKey || e.evt.ctrlKey)) {
      selectLayers([]);
    }
  };

  const handleStageMouseMove = () => {
    if (!isMarqueeSelecting || !marqueeStart) return;
    const pt = getStagePointer();
    if (!pt) return;
    const x = Math.min(pt.x, marqueeStart.x);
    const y = Math.min(pt.y, marqueeStart.y);
    const width = Math.abs(pt.x - marqueeStart.x);
    const height = Math.abs(pt.y - marqueeStart.y);
    setMarqueeRect({ x, y, width, height });
  };

  const rectsIntersect = (a: {x:number;y:number;width:number;height:number}, b: {x:number;y:number;width:number;height:number}) => {
    return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  };

  const handleStageMouseUp = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!isMarqueeSelecting || !marqueeRect) return setIsMarqueeSelecting(false), setMarqueeRect(null), setMarqueeStart(null);
    const additive = e.evt.shiftKey || e.evt.metaKey || e.evt.ctrlKey;
    const newlySelected = layers
      .filter((l) => rectsIntersect({ x: l.x, y: l.y, width: l.width, height: l.height }, marqueeRect))
      .map((l) => l.id);
    let result: typeof selectedIds = [];
    if (additive) {
      const set = new Set([...selectedIds, ...newlySelected]);
      result = Array.from(set);
    } else {
      result = newlySelected;
    }
    selectLayers(result);
    setIsMarqueeSelecting(false);
    setMarqueeRect(null);
    setMarqueeStart(null);
  };

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Select all
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        selectLayers(layers.map((l) => l.id));
        return;
      }

      // If editing a textarea overlay, ignore canvas shortcuts
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      const isEditing = activeTag === 'textarea' || activeTag === 'input';

      if (!selectedIds.length || isEditing) return;

      const step = e.shiftKey ? 10 : 1;
      let deltaX = 0;
      let deltaY = 0;

      switch (e.key) {
        case 'ArrowLeft':
          deltaX = -step;
          break;
        case 'ArrowRight':
          deltaX = step;
          break;
        case 'ArrowUp':
          deltaY = -step;
          break;
        case 'ArrowDown':
          deltaY = step;
          break;
        case 'Delete':
        case 'Backspace':
          // Delete selected layers
          selectedIds.forEach((id) => deleteLayer(id));
          commit();
          return;
        default:
          return;
      }

      e.preventDefault();
      
      // Update all selected layers
      selectedIds.forEach(id => {
        const layer = layers.find(l => l.id === id);
        if (layer) {
          updateLayer(id, {
            x: layer.x + deltaX,
            y: layer.y + deltaY,
          });
        }
      });
      
      // Debounce commit for smooth nudging
      setTimeout(() => commit(), 150);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, layers, updateLayer, commit, selectLayers, deleteLayer]);

  // (removed) snapToCenter helper was unused after generalized snapping implementation

  // Multi-select group transform handlers
  const handleGroupTransform = useCallback(() => {
    if (!groupTransformerRef.current || selectedIds.length <= 1) return;

    const transformer = groupTransformerRef.current;
    const node = transformer.getNode();
    if (!node) return;

    // Get transform deltas
    const deltaX = node.x();
    const deltaY = node.y();
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    const rotation = node.rotation();

    // Apply transforms to all selected layers
    selectedIds.forEach(id => {
      const layer = layers.find(l => l.id === id);
      if (layer && !layer.locked) {
        // Calculate new position relative to group transform
        const newX = layer.x * scaleX + deltaX;
        const newY = layer.y * scaleY + deltaY;
        const newWidth = layer.width * scaleX;
        const newHeight = layer.height * scaleY;

        updateLayer(id, {
          x: newX,
          y: newY,
          width: Math.max(5, newWidth),
          height: Math.max(5, newHeight),
          rotation: layer.rotation + rotation,
        });
      }
    });

    // Reset transformer
    node.x(0);
    node.y(0);
    node.scaleX(1);
    node.scaleY(1);
    node.rotation(0);
  }, [selectedIds, layers, updateLayer]);

  const handleGroupDrag = useCallback(() => {
    if (!groupTransformerRef.current || selectedIds.length <= 1) return;

    const transformer = groupTransformerRef.current;
    const node = transformer.getNode();
    if (!node) return;

    const deltaX = node.x();
    const deltaY = node.y();

    // Apply position delta to all selected layers
    selectedIds.forEach(id => {
      const layer = layers.find(l => l.id === id);
      if (layer && !layer.locked) {
        updateLayer(id, {
          x: layer.x + deltaX,
          y: layer.y + deltaY,
        });
      }
    });

    // Reset position
    node.x(0);
    node.y(0);
  }, [selectedIds, layers, updateLayer]);

  // Store refs for each TextNode to enable group transforms
  const nodeRefs = useRef<Map<string, Konva.Group>>(new Map());

  const setNodeRef = useCallback((layerId: string, node: Konva.Group | null) => {
    if (node) {
      nodeRefs.current.set(layerId, node);
    } else {
      nodeRefs.current.delete(layerId);
    }
  }, []);

  // Update group transformer when selection changes
  useEffect(() => {
    if (!groupTransformerRef.current) return;

    const transformer = groupTransformerRef.current;
    
    if (selectedIds.length > 1) {
      // Get all selected layer nodes from refs
      const selectedNodes = selectedIds
        .map(id => nodeRefs.current.get(id))
        .filter(Boolean) as Konva.Group[];

      if (selectedNodes.length > 1) {
        transformer.nodes(selectedNodes);
        transformer.getLayer()?.batchDraw();
      }
    } else {
      transformer.nodes([]);
    }
  }, [selectedIds]);

  return (
    <div className="flex-1 flex items-center justify-center bg-gray-100 overflow-hidden">
      <div
        className="relative border border-gray-300 shadow-lg"
        style={{
          width: stageWidth * scale,
          height: stageHeight * scale,
        }}
      >
        <Stage
          ref={stageRef}
          width={stageWidth}
          height={stageHeight}
          scaleX={scale}
          scaleY={scale}
          onClick={handleStageClick}
          onTap={handleStageClick}
          onMouseDown={handleStageMouseDown}
          onMouseMove={handleStageMouseMove}
          onMouseUp={handleStageMouseUp}
          onTouchStart={handleStageMouseDown}
          onTouchMove={handleStageMouseMove}
          onTouchEnd={handleStageMouseUp}
        >
          {/* Background Layer */}
          <Layer>
            {bgImage && (
              <KonvaImage
                image={bgImage}
                width={stageWidth}
                height={stageHeight}
                listening={false}
              />
            )}
          </Layer>

          {/* Guides Layer */}
          <Layer listening={false}>
            <Guides />
          </Layer>

          {/* Content Layer */}
          <Layer>
            {layers.map((layer) => (
              <TextNode
                key={layer.id}
                layer={layer}
                isSelected={selectedIds.includes(layer.id)}
                onSelect={(evt: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
                  const additive = evt.evt.shiftKey || evt.evt.metaKey || evt.evt.ctrlKey;
                  if (additive) {
                    const already = selectedIds.includes(layer.id);
                    const next = already ? selectedIds.filter((id) => id !== layer.id) : [...selectedIds, layer.id];
                    selectLayers(next);
                  } else {
                    selectLayers([layer.id]);
                  }
                }}
                onTransform={(attrs: TransformAttrs) => {
                  const snapped = computeSnapping({ id: layer.id, x: attrs.x, y: attrs.y, width: attrs.width, height: attrs.height });
                  updateLayer(layer.id, {
                    x: snapped.x,
                    y: snapped.y,
                    width: attrs.width,
                    height: attrs.height,
                    rotation: attrs.rotation,
                  });
                  setActiveGuides(snapped.guides);
                }}
                onTransformEnd={() => { commit(); clearGuides(); }}
                stageRef={stageRef}
                setNodeRef={setNodeRef}
              />
            ))}
          </Layer>

          {/* Marquee selection overlay */}
          {marqueeRect && (
            <Layer listening={false}>
              <Rect
                x={marqueeRect.x}
                y={marqueeRect.y}
                width={marqueeRect.width}
                height={marqueeRect.height}
                fill="rgba(99,102,241,0.12)" // indigo-500 @ 12%
                stroke="#6366F1"
                dash={[4, 4]}
              />
            </Layer>
          )}

          {/* Group Transformer for multi-select */}
          {selectedIds.length > 1 && (
            <Layer>
              <Transformer
                ref={groupTransformerRef}
                flipEnabled={false}
                rotateEnabled={true}
                resizeEnabled={true}
                onTransform={handleGroupTransform}
                onDragMove={handleGroupDrag}
                onTransformEnd={() => { commit(); clearGuides(); }}
                onDragEnd={() => { commit(); clearGuides(); }}
                boundBoxFunc={(oldBox, newBox) => {
                  // Limit resize
                  if (Math.abs(newBox.width) < 10 || Math.abs(newBox.height) < 10) {
                    return oldBox;
                  }
                  return newBox;
                }}
              />
            </Layer>
          )}
        </Stage>
      </div>
    </div>
  );
};
