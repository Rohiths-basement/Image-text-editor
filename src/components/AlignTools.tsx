import React from 'react';
import { useEditor } from '../editor/store';
import type { TextLayer } from '../editor/types';

type Bounds = {
  id: string;
  left: number;
  right: number;
  top: number;
  bottom: number;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
};

interface AlignToolsProps {
  className?: string;
}

const ALIGN_ACTIONS = [
  { id: 'left', label: 'L', title: 'Align Left', icon: '⫷' },
  { id: 'center', label: 'C', title: 'Align Center', icon: '⫸' },
  { id: 'right', label: 'R', title: 'Align Right', icon: '⫸' },
  { id: 'top', label: 'T', title: 'Align Top', icon: '⫷' },
  { id: 'middle', label: 'M', title: 'Align Middle', icon: '⫸' },
  { id: 'bottom', label: 'B', title: 'Align Bottom', icon: '⫸' },
];

const DISTRIBUTE_ACTIONS = [
  { id: 'horizontal', label: 'H', title: 'Distribute Horizontally', icon: '⟷' },
  { id: 'vertical', label: 'V', title: 'Distribute Vertically', icon: '↕' },
];

export const AlignTools: React.FC<AlignToolsProps> = ({ className = '' }) => {
  const { layers, selectedIds, updateLayer, commit } = useEditor();
  
  const selectedLayers = layers.filter((layer: TextLayer) => selectedIds.includes(layer.id));
  const canAlign = selectedLayers.length >= 2;
  const canDistribute = selectedLayers.length >= 3;

  const handleAlign = (action: string) => {
    if (!canAlign) return;

    const bounds: Bounds[] = selectedLayers.map((layer: TextLayer) => ({
      id: layer.id,
      left: layer.x,
      right: layer.x + layer.width,
      top: layer.y,
      bottom: layer.y + layer.height,
      centerX: layer.x + layer.width / 2,
      centerY: layer.y + layer.height / 2,
      width: layer.width,
      height: layer.height,
    }));

    let targetValue: number;

    switch (action) {
      case 'left':
        targetValue = Math.min(...bounds.map(b => b.left));
        bounds.forEach((bound) => {
          updateLayer(bound.id, { x: targetValue });
        });
        break;
      case 'center':
        targetValue = (Math.min(...bounds.map(b => b.left)) + Math.max(...bounds.map(b => b.right))) / 2;
        bounds.forEach((bound) => {
          const layer = selectedLayers.find((l: TextLayer) => l.id === bound.id)!;
          updateLayer(bound.id, { x: targetValue - layer.width / 2 });
        });
        break;
      case 'right':
        targetValue = Math.max(...bounds.map(b => b.right));
        bounds.forEach((bound) => {
          const layer = selectedLayers.find((l: TextLayer) => l.id === bound.id)!;
          updateLayer(bound.id, { x: targetValue - layer.width });
        });
        break;
      case 'top':
        targetValue = Math.min(...bounds.map(b => b.top));
        bounds.forEach((bound) => {
          updateLayer(bound.id, { y: targetValue });
        });
        break;
      case 'middle':
        targetValue = (Math.min(...bounds.map(b => b.top)) + Math.max(...bounds.map(b => b.bottom))) / 2;
        bounds.forEach((bound) => {
          const layer = selectedLayers.find((l: TextLayer) => l.id === bound.id)!;
          updateLayer(bound.id, { y: targetValue - layer.height / 2 });
        });
        break;
      case 'bottom':
        targetValue = Math.max(...bounds.map(b => b.bottom));
        bounds.forEach((bound) => {
          const layer = selectedLayers.find((l: TextLayer) => l.id === bound.id)!;
          updateLayer(bound.id, { y: targetValue - layer.height });
        });
        break;
    }
    
    commit();
  };

  const handleDistribute = (action: string) => {
    if (!canDistribute) return;

    const bounds: Bounds[] = selectedLayers.map((layer: TextLayer) => ({
      id: layer.id,
      left: layer.x,
      right: layer.x + layer.width,
      top: layer.y,
      bottom: layer.y + layer.height,
      centerX: layer.x + layer.width / 2,
      centerY: layer.y + layer.height / 2,
      width: layer.width,
      height: layer.height,
    }));

    if (action === 'horizontal') {
      // Sort by center X position
      bounds.sort((a: Bounds, b: Bounds) => a.centerX - b.centerX);
      
      const leftmost = bounds[0].centerX;
      const rightmost = bounds[bounds.length - 1].centerX;
      const totalSpace = rightmost - leftmost;
      const spacing = totalSpace / (bounds.length - 1);

      bounds.forEach((bound: Bounds, index: number) => {
        if (index === 0 || index === bounds.length - 1) return; // Don't move first and last
        const targetCenterX = leftmost + spacing * index;
        updateLayer(bound.id, { x: targetCenterX - bound.width / 2 });
      });
    } else if (action === 'vertical') {
      // Sort by center Y position
      bounds.sort((a: Bounds, b: Bounds) => a.centerY - b.centerY);
      
      const topmost = bounds[0].centerY;
      const bottommost = bounds[bounds.length - 1].centerY;
      const totalSpace = bottommost - topmost;
      const spacing = totalSpace / (bounds.length - 1);

      bounds.forEach((bound: Bounds, index: number) => {
        if (index === 0 || index === bounds.length - 1) return; // Don't move first and last
        const targetCenterY = topmost + spacing * index;
        updateLayer(bound.id, { y: targetCenterY - bound.height / 2 });
      });
    }
    
    commit();
  };

  if (selectedIds.length < 2) {
    return null;
  }

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      <div className="flex items-center space-x-1 px-2 py-1 bg-gray-50 rounded-md">
        <span className="text-xs text-gray-500 font-medium">Align:</span>
        {ALIGN_ACTIONS.map((action) => (
          <button
            key={action.id}
            onClick={() => handleAlign(action.id)}
            disabled={!canAlign}
            className="w-6 h-6 flex items-center justify-center text-xs font-mono bg-white border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title={action.title}
          >
            {action.label}
          </button>
        ))}
      </div>

      {canDistribute && (
        <div className="flex items-center space-x-1 px-2 py-1 bg-gray-50 rounded-md">
          <span className="text-xs text-gray-500 font-medium">Distribute:</span>
          {DISTRIBUTE_ACTIONS.map((action) => (
            <button
              key={action.id}
              onClick={() => handleDistribute(action.id)}
              className="w-6 h-6 flex items-center justify-center text-xs font-mono bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors"
              title={action.title}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
